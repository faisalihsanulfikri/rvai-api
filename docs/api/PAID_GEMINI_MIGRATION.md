# Migration: Vision-Bridge → Gemini 2.5 Flash Image

**Date**: 2026-05-20
**Status**: Implemented
**Scope**: [src/modules/generations/ai.service.ts](../../src/modules/generations/ai.service.ts) only

---

## TL;DR

With paid Gemini billing now enabled on the project, image generation switches from the **vision-bridge** (Gemini Vision describes → Pollinations generates) to **direct image-out** using `gemini-2.5-flash-image`. The model now sees the actual reference image pixels via `inlineData`, so img2img is pixel-faithful instead of going through a 120-word text description.

This resolves the "Vision-bridge is lossy" known issue called out in [VISION_BRIDGE_FEATURE.md](./VISION_BRIDGE_FEATURE.md#known-issues--future-considerations) (item 1).

---

## What changed

[src/modules/generations/ai.service.ts](../../src/modules/generations/ai.service.ts):

- Removed `describeInputImage()` (Gemini Vision describe step).
- Removed Pollinations URL composition and `ASPECT_RATIO_DIMENSIONS` lookup table.
- `generateImageBuffer()` now calls `ai.models.generateContent({ model: 'gemini-2.5-flash-image', ... })` with:
  - `contents`: `inlineData` for the reference image (if any) + the text prompt
  - `config.responseModalities: [Modality.IMAGE]`
  - `config.imageConfig.aspectRatio`: passed straight through (`"1:1"`, `"16:9"`, `"9:16"`, `"4:3"`)
  - `config.temperature: 0` + `config.seed` derived from `sha256(aspectRatio | finalPrompt)` for determinism
- Image bytes come back as base64 in `response.candidates[0].content.parts[].inlineData.data`.

The `finalPrompt` composition is simpler now: when an input image is attached, the prompt is prefixed with an instruction to preserve geometry / camera angle and apply the requested change. No more `Reference scene: ...` text-bridge scaffolding.

---

## API contract — unchanged

The HTTP contract for `POST /api/generations` and `/:id/regenerate` is identical:

- `prompt`, `style`, `aspectRatio`, `inputImage` — same fields, same types, same semantics
- Persisted `inputImageFilename`, `finalPrompt`, `imageUrl` — same fields
- Status flow `pending → processing → success` — same

Frontends do not need to change.

---

## Env vars

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | Required. Paid-tier billing must be enabled on the project. |
| `GEMINI_IMAGE_MODEL` | `gemini-2.5-flash-image` | Override the image model if needed (e.g. pin to a dated snapshot). |
| ~~`GEMINI_VISION_MODEL`~~ | — | **No longer used.** Safe to remove from `.env`. |

---

## Determinism

The `DETERMINISTIC_GENERATION.md` contract still holds: same `(inputImage, prompt, style, aspectRatio)` → same output image.

- The vision-describe step that needed `temperature: 0` + structured prompt is gone.
- Gemini image generation is now seeded via `config.seed = sha256(aspectRatio | finalPrompt) → int32` (signed; Gemini's `generation_config.seed` is `TYPE_INT32`, not uint32).
- `config.temperature: 0` is set as belt-and-braces against any sampling-stage randomness.

`POST /:id/regenerate` with no input changes still returns the same image. To expose explicit variation, surface `seed` on the API (deferred — same follow-up as before).

---

## Worker flow (updated)

```
Queue Job #1: generation-<id>
  ├─ Status → "processing"
  ├─ Load inputImage from disk → base64 (if inputImageFilename present)
  ├─ Gemini 2.5 Flash Image:
  │     contents: [inlineData(image)?, text(finalPrompt)]
  │     config: { responseModalities: [IMAGE], temperature: 0, seed, imageConfig: { aspectRatio } }
  │     → base64 PNG/JPEG in candidates[0].content.parts[].inlineData.data
  ├─ Save image to disk
  ├─ Update database with imageUrl + finalPrompt
  └─ Status → "success"
```

Pollinations is no longer in the path. Network egress is now to `generativelanguage.googleapis.com` only.

---

## Cost & quota

Paid tier. `gemini-2.5-flash-image` is billed per image — check Google AI Studio billing dashboard for current pricing. There is no longer a free fallback in the code; if `GEMINI_API_KEY` is missing or billing is disabled, generation will fail.

If reliability or cost ceiling matters, a fallback path back to the vision-bridge is recoverable from git history (commit before this migration).

---

## What now-stale docs say vs. reality

These docs still describe the vision-bridge workflow and should be read with this migration in mind:

- [GENERATION_FLOW.md](./GENERATION_FLOW.md) — "Phase 2: Job Processing" describes the Gemini-Vision + Pollinations bridge. The high-level flow is the same, but the worker now calls Gemini image directly.
- [VISION_BRIDGE_FEATURE.md](./VISION_BRIDGE_FEATURE.md) — entire document describes the pre-migration architecture. Kept for history.
- [DETERMINISTIC_GENERATION.md](./DETERMINISTIC_GENERATION.md) — the determinism contract still holds, but the implementation now uses `config.seed` on Gemini instead of `&seed=` on Pollinations.

---

## Verification

- `npm run typecheck` — clean.
- Manual end-to-end recommended: POST with and without `inputImage`, confirm `status: success` + downloadable `imageUrl`. With the same inputs across two POSTs, confirm identical bytes (determinism — text-to-image only).

---

## Post-launch refinements

The initial migration call signature didn't survive contact with the API. These adjustments are now in `ai.service.ts`:

### Config differs between text-to-image and image-edit

| Field | Text-to-image (no `inputImage`) | Image-edit (with `inputImage`) |
|---|---|---|
| `responseModalities` | `[IMAGE, TEXT]` | `[IMAGE, TEXT]` |
| `seed` | ✅ set (deterministic) | ❌ omitted — Gemini rejects with 400 |
| `imageConfig.aspectRatio` | ✅ set | ❌ omitted — Gemini infers from source image |
| `temperature` | ❌ never set — image-output models reject it | ❌ never set |

### API quirks discovered

- **`seed` is `TYPE_INT32`, not `uint32`** — first call errored with `Invalid value at 'generation_config.seed' (TYPE_INT32), 3812238859`. Fixed by `readInt32BE(0)` on the hash.
- **`temperature: 0` is rejected** on image-output models — generic 400, no field violations. Removed.
- **`responseModalities: [IMAGE]` alone fails** — must include `TEXT` even if you only consume the image part.
- **`seed` + `inlineData` together are rejected** — image-edit mode loses byte-stable determinism. Documented in [DETERMINISTIC_GENERATION.md](./DETERMINISTIC_GENERATION.md).

### Mimetype handling

Gemini 2.5 Flash Image returns **PNG** bytes (not JPEG). The image-storage layer had been hardcoding `.jpg` extensions and `Content-Type: image/jpeg`. Now uses magic-byte detection (`detectMimeFromBuffer`) end-to-end:

- `saveImage()` picks the file extension from actual bytes (PNG → `.png`).
- `saveInputImage()` sniffs the decoded buffer instead of trusting the client's declared mimetype.
- Worker sniffs the inputImage file before sending to Gemini — handles even pre-existing mislabeled files.
- `serveImage()` sets `Content-Type` from the actual bytes.

Without this fix, regenerate-of-regenerate failed with 400 INVALID_ARGUMENT (PNG bytes labeled as `image/jpeg`).

See [SESSION_REVIEW_2026_05_20.md](./SESSION_REVIEW_2026_05_20.md) for the full story.
