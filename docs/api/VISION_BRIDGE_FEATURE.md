# Vision-Bridge Generation Feature

**Date**: 2026-05-19 (session 2)
**Status**: ✅ Implemented
**Scope**: `inputImage` payload support + aspect ratio mapping, all free-tier

---

## TL;DR

Users can now POST an optional reference image alongside the prompt and aspect ratio. The worker uses **Gemini Vision** (free tier) to describe the reference image as text, merges that description with the user prompt, then sends the combined text to **Pollinations.ai** (free) to generate the final image. Aspect ratio is mapped to Pollinations `width`/`height` query params.

This unlocks "regenerate from a previous image + new prompt" workflows without requiring a paid Gemini billing tier.

---

## Motivation & Decision Trail

The session started with: "we're using Pollinations for image generation — can we switch to Gemini, and pass the previous image in to condition the next generation?"

What we tried, in order:

| Attempt | Outcome |
|---|---|
| 1. Gemini image gen (`gemini-2.5-flash-image-preview`) with `imageConfig.aspectRatio` and `inlineData` for the input image | 404 — `-preview` suffix gone |
| 2. Gemini image gen (`gemini-2.5-flash-image`, GA) | 429 `RESOURCE_EXHAUSTED` — `limit: 0` on `generate_content_free_tier_requests` for image-output models |
| 3. Same call against `gemini-2.5-flash` (text model) | 400 `Aspect ratio is not enabled for models/gemini-2.5-flash` — text model doesn't accept `imageConfig` and can't emit images anyway |
| 4. Pollinations with input image | Pollinations is text-to-image only; no img2img endpoint |
| 5. **Vision-bridge**: Gemini Vision (text output, free tier) describes the image → Pollinations generates from text | ✅ Works on free tier |

**Key insight**: The Gemini free tier blocks image *output* but allows image *input* (vision). Pollinations is free for text-to-image. Bridge them through a text description.

**Trade-off accepted**: Pollinations never sees the reference image, only a 120-word description. High-level structure (room type, layout, palette, materials, mood) transfers. Fine details (exact furniture placement, textures) do not. For interior-design ideation this is acceptable; for pixel-faithful editing it is not.

---

## Architecture

```
POST /api/generations
{
  prompt, style?, aspectRatio?, inputImage?  ← base64 data URL
}
        │
        ▼
[Controller]
  ├─ Validate prompt
  ├─ Decode inputImage data URL → save to disk → inputImageFilename
  └─ Create Generation { status: "pending", inputImageFilename } + enqueue job
        │
        ▼
[BullMQ worker]
  ├─ Status → "processing"
  ├─ Load inputImageFilename from disk → Buffer → base64
  ├─ Gemini Vision (gemini-2.5-flash, free):
  │     parts: [<inlineData image>, { text: "Describe this interior space..." }]
  │     → returns ≤120-word text description
  ├─ Build finalPrompt:
  │     "Reference scene: <description>
  │
  │      Transform to: <prompt>
  │
  │      Style: <style>"
  ├─ Pollinations:
  │     GET https://image.pollinations.ai/prompt/<encoded finalPrompt>
  │         ?width=<W>&height=<H>&nologo=true
  ├─ Save returned image → imageFilename
  └─ Status → "success", persist { imageUrl, imageFilename, finalPrompt }
```

When `inputImage` is omitted, the Gemini Vision step is skipped and the prompt is sent to Pollinations directly. The rest of the flow is unchanged.

---

## API Contract Changes

### `POST /api/generations` — new optional field

| Field | Type | Required | Description |
|---|---|---|---|
| `inputImage` | string | ❌ No | Base64 data URL: `data:image/jpeg;base64,...` (also `image/png`, `image/webp`). Max payload 15 MB. |
| `aspectRatio` | string | ❌ No | `1:1` → 1024×1024, `16:9` → 1280×720, `9:16` → 720×1280, `4:3` → 1024×768. Default `1:1`. |

### `POST /api/generations/:id/regenerate` — same shape

Accepts `inputImage`. When supplied, the previously stored input image for that generation (if any) is deleted from disk and replaced.

### Persisted on the Generation document

| Field | Notes |
|---|---|
| `inputImageFilename?: string` | Filename in `uploads/images/`. Served via `/api/images/:filename` like generated images. |
| `finalPrompt: string` | The composed prompt actually sent to Pollinations — useful for debugging "why did the model output X". |

### Body size

`express.json({ limit: '15mb' })` in [src/app.ts](../../src/app.ts). Base64 images inflate the wire size by ~33%, so a 10 MB raw image lands around 13.3 MB encoded. 15 MB gives reasonable headroom; raise further if you accept larger uploads.

---

## Files Touched

| File | Change |
|---|---|
| [src/modules/generations/ai.service.ts](../../src/modules/generations/ai.service.ts) | Full rewrite. `describeInputImage()` (Gemini Vision call) + `buildFinalPrompt()` + `generateImageBuffer()` (Pollinations call with dims). Returns `{ buffer, finalPrompt }`. |
| [src/modules/generations/image-storage.service.ts](../../src/modules/generations/image-storage.service.ts) | Added `decodeImageDataUrl`, `saveInputImage`, `getMimeTypeForFilename`. |
| [src/modules/generations/generation.service.ts](../../src/modules/generations/generation.service.ts) | `createGeneration` and `regenerateDesign` accept `inputImage`, save it, persist `inputImageFilename`. `deleteGeneration` cleans up the input image too. |
| [src/modules/generations/generation.controller.ts](../../src/modules/generations/generation.controller.ts) | Pass `inputImageFilename` into the queue job. |
| [src/modules/generations/generation.queue.ts](../../src/modules/generations/generation.queue.ts) | Worker loads input image from disk → base64, threads `aspectRatio` through, persists returned `finalPrompt`. |
| [src/modules/generations/generation.types.ts](../../src/modules/generations/generation.types.ts) | `CreateGenerationRequest` + `RegenerateRequest` got `inputImage?: string`. |
| [src/modules/generations/generation.model.ts](../../src/modules/generations/generation.model.ts) | Added `inputImageFilename: String` to schema. |
| [src/shared/types/index.ts](../../src/shared/types/index.ts) | `Generation.inputImageFilename?`, `GenerationJob.inputImageFilename?`. |
| [src/app.ts](../../src/app.ts) | JSON body limit raised from default (100 KB) to 15 MB. |
| [package.json](../../package.json) | Added `@google/genai` (v2.x). The legacy `@google/generative-ai` is no longer imported but is left installed — see "Known Issues". |

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | Required. Used for Gemini Vision (free tier). |
| `GEMINI_VISION_MODEL` | `gemini-2.5-flash` | Override the vision model if needed (e.g. `gemini-2.5-flash-lite` for cheaper/faster). |

No Pollinations key is needed — it's anonymous.

---

## Aspect Ratio Mapping

Pollinations is dimension-driven, not ratio-driven. The worker maps the enum to pixel dimensions:

```ts
const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1':  { width: 1024, height: 1024 },
  '16:9': { width: 1280, height: 720  },
  '9:16': { width: 720,  height: 1280 },
  '4:3':  { width: 1024, height: 768  },
};
```

The model treats `width`/`height` as a target — output dimensions match exactly in practice. There is no separate "strict ratio" mode like Gemini's `imageConfig.aspectRatio`; the dimensions themselves are the contract.

---

## Verification

- ✅ `npm run typecheck` clean
- ✅ End-to-end: POST → pending → processing → success with both `inputImage` present and absent
- ⚠️ Did not load-test Gemini Vision rate limits — free tier is ~10 RPM for `gemini-2.5-flash` per project, may need backoff if multiple users generate concurrently

---

## Known Issues / Future Considerations

1. **Vision-bridge is lossy**. Pollinations never sees the actual reference image. If a user needs pixel-faithful editing (e.g. "change only the couch color, keep everything else exact"), this approach will not deliver. The fix is enabling Gemini paid tier and switching `ai.service.ts` to call `gemini-2.5-flash-image` with `inlineData` for the input image — code path was prototyped earlier in this session and can be restored from git history if needed.

2. **`@google/generative-ai` is still in `package.json`** but no longer imported. Safe to remove with `npm uninstall @google/generative-ai` in a follow-up.

3. **Gemini Vision quota**. Free tier `gemini-2.5-flash` has per-minute request limits. Under burst load the worker will throw and BullMQ will retry — fine for low traffic, but a circuit breaker / dead-letter strategy is worth adding before serving real users.

4. **Pollinations is best-effort infrastructure** with no SLA. Outages will fail jobs. No automatic fallback configured. If reliability matters, add a fallback provider (Together.ai `FLUX.1-schnell`, etc.) behind a try/catch in `generateImageBuffer`.

5. **Description prompt is fixed**. The "Describe this interior space..." prompt is interior-design-specific. Generalizing to other domains means making the meta-prompt configurable or branching by use case.

6. **No description caching**. If the same input image is reused across regenerations, we call Gemini Vision every time. Could cache `inputImageFilename → description` keyed by file hash if this becomes a cost concern (it's free today, so deferred).

7. **`finalPrompt` length**. Pollinations URL has practical length limits (~2 KB). With description (~120 words ≈ 700 chars) + prompt + style, we're comfortably under. Watch this if you raise the description word cap.

---

## Summary

We attempted three paid/blocked paths to image-conditioned generation before landing on a vision-bridge: **Gemini Vision describes the input image, Pollinations generates from the merged text**. The result is fully free, supports the original feature ask, and trades pixel-faithful conditioning for high-level semantic conditioning — an acceptable trade for interior-design ideation.

The `inputImage` payload + `aspectRatio` enforcement (via dimensions) + persisted `finalPrompt` are all live and typechecked. The paid-Gemini path is recoverable from git if/when billing is enabled.
