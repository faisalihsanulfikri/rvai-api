# Session Review — 2026-05-20

**Status**: Implemented & typechecked
**Theme**: Migrate to paid Gemini 2.5 Flash Image, then stabilize the pipeline through several real-world failure modes.

---

## TL;DR

1. Swapped the **vision-bridge → Pollinations** image generator for **direct calls to `gemini-2.5-flash-image`** now that the project has paid Gemini billing.
2. Iterated through four Gemini API quirks the docs don't fully spell out (seed type, response modalities, `imageConfig` × `inlineData` conflict, no seed on edits).
3. Fixed a **PNG-saved-as-JPG mimetype bug** that surfaced as 400 INVALID_ARGUMENT on regenerate-of-regenerate.
4. Made the worker **stop flashing `failed` status during transient retries** — only the final BullMQ attempt writes the failed state.
5. Added a new **`room`** enum field to generations (6 values), threaded through the model/controller/service/queue/prompt.
6. Discussed (but did not implement) **SSE vs polling** and a **prompt-engineering rewrite of the preserve preamble** — both deferred.

---

## 1. Provider migration: Vision-bridge → Gemini 2.5 Flash Image

**Why**: The previous architecture used Gemini Vision (free) to describe an input image as text, then sent that text to Pollinations to generate. With paid Gemini available, we can pass the input image bytes directly to `gemini-2.5-flash-image` and get pixel-faithful editing instead of going through a 120-word text description.

See [PAID_GEMINI_MIGRATION.md](./PAID_GEMINI_MIGRATION.md) for the architecture and the worker flow.

[src/modules/generations/ai.service.ts](../../src/modules/generations/ai.service.ts) was rewritten:
- Removed `describeInputImage()` and the Pollinations URL composition.
- `generateImageBuffer()` calls `ai.models.generateContent({ model: 'gemini-2.5-flash-image', ... })` with `inlineData` for the reference image and `imageConfig.aspectRatio` for sizing.
- Image bytes come back as base64 in `response.candidates[0].content.parts[].inlineData.data`.

API contract (`POST /api/generations`, `/:id/regenerate`) unchanged — frontend needs no changes.

---

## 2. Four Gemini API quirks discovered in production

These are not obvious from the docs; documenting in case anyone hits them again.

### 2a. `seed` is `TYPE_INT32`, not `uint32`

First request errored with:
```
Invalid value at 'generation_config.seed' (TYPE_INT32), 3812238859
```
We were computing `seed = sha256(...).readUInt32BE(0)`, which can exceed `2^31 − 1`. Switched to `readInt32BE(0)` (signed). The seed is still deterministic — just lives in the signed range.

### 2b. `temperature` is rejected on image-output models

After fixing seed, the next call 400'd with a generic `INVALID_ARGUMENT` (no `fieldViolations`). The image-output model doesn't accept `temperature` on `generation_config`; we'd been passing `temperature: 0` for determinism. Removed.

### 2c. `responseModalities` must include `TEXT`, not just `IMAGE`

`responseModalities: [Modality.IMAGE]` alone fails. The model returns both a text part and an image part; you must request both even if you only consume the image. Now using `[Modality.IMAGE, Modality.TEXT]`.

### 2d. `seed` + `imageConfig.aspectRatio` are **not allowed when `inlineData` is present**

Text-to-image with `seed` and `imageConfig.aspectRatio` works. Add an `inlineData` image part to the same request and it 400s. The image-editing path infers output dimensions from the source image and does not accept a deterministic seed.

Our current behavior in [ai.service.ts](../../src/modules/generations/ai.service.ts):
- **No input image** → `config = { responseModalities: [IMAGE, TEXT], seed, imageConfig: { aspectRatio } }`
- **With input image** → `config = { responseModalities: [IMAGE, TEXT] }` (seed and imageConfig stripped)

Implication: image-edit regenerations are no longer byte-deterministic. The previous `DETERMINISTIC_GENERATION.md` contract only applies to text-to-image now. See [DETERMINISTIC_GENERATION.md](./DETERMINISTIC_GENERATION.md) note at the top.

---

## 3. PNG-saved-as-JPG bug (regenerate-of-regenerate crash)

**Symptom**: Regenerating a generation that itself had a Gemini-generated image as input failed with `400 INVALID_ARGUMENT`.

**Root cause chain**:
1. Gemini 2.5 Flash Image returns **PNG** bytes.
2. `saveImage()` hardcoded the `.jpg` extension regardless of actual format.
3. When that file was later re-uploaded as a reference image, `getMimeTypeForFilename()` looked at the `.jpg` extension and reported `image/jpeg`.
4. We sent PNG bytes to Gemini with `mimeType: image/jpeg` → Gemini sniffs the bytes, sees a mismatch, rejects with 400.

**Fix**: magic-byte detection everywhere mimetype is determined. Added [`detectMimeFromBuffer(buffer)`](../../src/modules/generations/image-storage.service.ts) which checks PNG / JPEG / WebP magic bytes, and:
- `saveImage(buffer, { mimeType })` — extension now matches actual bytes (Gemini's PNG output saves as `.png`).
- `saveInputImage()` — sniffs decoded buffer instead of trusting the data URL's declared mimeType.
- Worker in [generation.queue.ts](../../src/modules/generations/generation.queue.ts) — sniffs `inputImage` bytes before sending to Gemini, so even pre-existing mislabeled files are handled.
- `serveImage()` in [image.controller.ts](../../src/modules/images/image.controller.ts) — `Content-Type` now reflects actual bytes, not the file extension.

Removed the obsolete `getMimeTypeForFilename()` helper. Trusting the extension was the source of this entire class of bug.

**Existing mislabeled files** (PNG saved as `.jpg` before this fix) are now handled correctly on read — no migration needed.

---

## 4. Worker retry: defer `status='failed'` until final attempt

**Symptom**: User saw `status: 'failed'` flash briefly in the UI during transient Gemini 500s, even though the BullMQ retry succeeded shortly after.

**Cause**: The worker's catch block always wrote `status: 'failed'` to MongoDB *before* throwing — and BullMQ's retry would then re-run the worker, which would write `status: 'processing'` again. But polling between those two writes saw `failed`.

**Fix** ([generation.queue.ts](../../src/modules/generations/generation.queue.ts)):
- Earlier attempts (1–2 of 3): log `↻ Generation X attempt N/3 failed, retrying:` at warn level. DB status stays at `processing`.
- Final attempt (3 of 3): log full stack at error level, write `status: 'failed'` to DB.

Uses `job.attemptsMade + 1 >= (job.opts.attempts ?? 1)` to detect the final attempt.

User-facing behavior: transient Gemini 500s no longer surface to the UI as long as one of the 3 retries succeeds.

---

## 5. New `room` field on generations

Added to mirror how `style` works.

**Values** (kebab-case, matches the existing slug convention):
- `living-room`
- `bedroom`
- `kitchen`
- `bathroom`
- `home-office`
- `dining-room`

**Plumbing**:
- [src/shared/types/index.ts](../../src/shared/types/index.ts) — new `Room` type; added to `Generation` and `GenerationJob`.
- [generation.types.ts](../../src/modules/generations/generation.types.ts) — added to `CreateGenerationRequest` and `RegenerateRequest`.
- [generation.model.ts](../../src/modules/generations/generation.model.ts) — Mongoose schema field with enum validation.
- [generation.controller.ts](../../src/modules/generations/generation.controller.ts) — returned in all JSON responses; forwarded into queue job.
- [generation.service.ts](../../src/modules/generations/generation.service.ts) — persisted on create and updated on regenerate (only if provided, matching `style`/`aspectRatio` semantics).
- [generation.queue.ts](../../src/modules/generations/generation.queue.ts) — destructured from job, passed to `generateImageBuffer`.
- [ai.service.ts](../../src/modules/generations/ai.service.ts) — `ROOM_LABELS` map turns kebab-case slug into a human-readable label; appended to the Gemini prompt as `Room: <Human Label>` next to the existing `Style:` line.

API contract update lives in [generations.md](./generations.md).

---

## 6. Deferred decisions

### SSE vs polling
User asked about replacing polling with WebSockets / SSE due to load concerns. Recommendation given: **SSE fits better than WebSocket** (one-way push, native `EventSource`, no socket.io overhead), but **polling indexed `findById` is genuinely cheap** — bumping the poll interval from 2s → 3-5s with backoff once status is `processing` likely captures most of the savings without architectural change. **User chose to keep polling.** SSE remains a follow-up if instant updates become a UX requirement.

### Prompt-engineering rewrite of the preserve preamble
User asked whether the image-edit preamble in `ai.service.ts:buildFinalPrompt` should be tuned. Discussion outcome:

- Current preamble (~22 tokens): `"Edit the attached interior reference image. Preserve room geometry, camera angle, and the overall layout. Apply the following change:"`
- Weakness: too soft on scope-limiting; Gemini drifts beyond the requested edit. Lighting direction and window positions are common drift surfaces but unmentioned.
- Proposed rewrite (~30 tokens): explicit `Change ONLY` scope-limiter + extend preserve list to include `window positions, lighting direction, and any objects not mentioned`.
- Also flagged: `Room:` line on edits gives the model contradictory signals when the source image is a different room. Drop `Room:` for image-edit case; keep for text-to-image.

**Not yet implemented.** Pending user approval.

---

## Files Touched

| File | Change |
|---|---|
| [src/modules/generations/ai.service.ts](../../src/modules/generations/ai.service.ts) | Full rewrite for Gemini direct image gen + room support + config branching for image-edit vs text-to-image |
| [src/modules/generations/image-storage.service.ts](../../src/modules/generations/image-storage.service.ts) | Added `detectMimeFromBuffer`; `saveImage` now uses real mimetype for extension; `saveInputImage` sniffs decoded bytes; removed `getMimeTypeForFilename` |
| [src/modules/generations/generation.queue.ts](../../src/modules/generations/generation.queue.ts) | Use `detectMimeFromBuffer` for inputImage mimetype; pass Gemini's reported mimetype into `saveImage`; defer `status='failed'` until final retry; thread `room` through |
| [src/modules/generations/generation.controller.ts](../../src/modules/generations/generation.controller.ts) | Forward and return `room` |
| [src/modules/generations/generation.service.ts](../../src/modules/generations/generation.service.ts) | Persist `room` on create and regenerate |
| [src/modules/generations/generation.model.ts](../../src/modules/generations/generation.model.ts) | Mongoose `room` field with enum validation |
| [src/modules/generations/generation.types.ts](../../src/modules/generations/generation.types.ts) | `room?: Room` on request types |
| [src/modules/images/image.controller.ts](../../src/modules/images/image.controller.ts) | `Content-Type` from detected mimetype, not hardcoded `image/jpeg` |
| [src/shared/types/index.ts](../../src/shared/types/index.ts) | Added `Room` type; `room?: Room` on `Generation` and `GenerationJob` |

Docs:
- [docs/api/PAID_GEMINI_MIGRATION.md](./PAID_GEMINI_MIGRATION.md) — created and refined throughout the session.
- [docs/api/generations.md](./generations.md) — updated with current provider and `room` field.
- [docs/api/INDEX.md](./INDEX.md), [docs/api/VISION_BRIDGE_FEATURE.md](./VISION_BRIDGE_FEATURE.md), [docs/api/DETERMINISTIC_GENERATION.md](./DETERMINISTIC_GENERATION.md), [docs/api/GENERATION_FLOW.md](./GENERATION_FLOW.md) — updated with provider notes pointing at the migration doc.

---

## Verification

- `npm run typecheck` — clean at every step.
- Manual end-to-end (per the user):
  - ✅ Text-to-image (no `inputImage`) works.
  - ✅ Image-edit with `inputImage` works after the seed/imageConfig conditional fix.
  - ✅ Regenerate of a regenerate works after the magic-byte mime fix.
  - ✅ Transient Gemini 500s no longer surface to UI thanks to deferred-failed-status logic.

---

## Known Issues / Future Considerations

1. **Image-edit determinism is gone.** Gemini doesn't allow `seed` with `inlineData`. If pixel-stable regenerations matter, the only path is sampling many candidates server-side and picking by hash, which is wasteful. Acceptable trade for now.
2. **Inline image size limit.** Gemini's inline payload limit is ~7 MB; high-res Gemini outputs re-fed as input could approach this. We added a `console.log` of the input base64 size in `generateImageBuffer`. If this becomes a problem, downscale before sending or switch to the Files API.
3. **Polling load.** SSE deferred per user decision. Frontend poll interval is still 2s — bumping to 3-5s would reduce MongoDB read load with no architectural change.
4. **Prompt-engineering rewrite pending.** Sketched but not applied. See section 6.
5. **`Room:` line on edits.** Currently appended to the prompt even when an input image is present, which can give Gemini contradictory signals. Will be addressed in the prompt rewrite when approved.
