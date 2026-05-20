# Multipart Upload Support

**Date**: 2026-05-19 (session 3)
**Status**: ✅ Implemented
**Scope**: `POST /api/generations` now accepts `multipart/form-data` in addition to JSON

> **2026-05-20 update:** this doc originally also covered `POST /api/generations/:id/regenerate`, which received the same multipart treatment. That endpoint has since been removed (the frontend "Regenerate" flow is now a pure prefill → `POST /api/generations` path). References to `/:id/regenerate` below are kept for historical accuracy but no longer reflect the live surface.

---

## TL;DR

The two generation endpoints used to accept JSON only, with the optional reference image arriving as a `data:image/...;base64,...` string in the `inputImage` field. The frontend instead sends `multipart/form-data` with the file under field name `referenceImage`. Result: `req.body` came back as `{}`, `prompt` was missing, and the request 400'd with `"Prompt is required"`.

We added `multer` on the two write endpoints. The controller now converts `req.file` → data URL and reuses the existing `saveInputImage(dataUrl)` path. The JSON contract is unchanged and still works — multipart is purely additive.

---

## Motivation & Decision Trail

The frontend POST looked like this (DevTools):

```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="prompt"

Modern minimalist living room with warm lighting...
------WebKitFormBoundary...
Content-Disposition: form-data; name="style"

modern
------WebKitFormBoundary...
Content-Disposition: form-data; name="aspectRatio"

16:9
------WebKitFormBoundary...
Content-Disposition: form-data; name="designId"

6a0b62c1c675d69bb7d8ae5d
------WebKitFormBoundary...
Content-Disposition: form-data; name="referenceImage"; filename="reference.jpeg"
Content-Type: image/jpeg

<binary>
------WebKitFormBoundary...--
```

[app.ts:12](../../src/app.ts#L12) only mounts `express.json({ limit: '15mb' })` — there's no multipart parser, so the whole body was dropped on the floor and the generation service's empty-prompt guard fired at [generation.service.ts:13](../../src/modules/generations/generation.service.ts#L13).

Two ways out:

| Option | What changes | Why we picked / skipped |
|---|---|---|
| A. Make the frontend send JSON + base64 data URL | No backend changes, matches existing docs | Forces ~33% wire inflation, doubles down on the 15 MB JSON limit hack, and breaks the frontend's chosen file-upload UX |
| **B. Accept multipart on the backend** | New `multer` middleware + small controller adapter | Native file-upload format, no base64 overhead, JSON path stays backward compatible — picked this |

Internally the storage path still consumes a data URL string. Rather than threading a new `{buffer, mimeType}` shape through `generation.service.ts` and `image-storage.ts`, the controller re-encodes the multipart file as a data URL and lets `saveInputImage` work unchanged. The wire-format win is preserved (no client-side base64); the in-process encode is a few ms and a few MB of transient buffer.

---

## Architecture

```
Frontend
  └── POST /api/generations
        Content-Type: multipart/form-data
        Fields: prompt, style, aspectRatio, designId
        File:   referenceImage (image/jpeg|png|webp)
              │
              ▼
[generation.route.ts]
  └── multer.single('referenceImage')         ← parses multipart, populates req.body + req.file
              │
              ▼
[generation.controller.ts: create / regenerate]
  ├── data = { ...req.body }                  ← string fields land here
  ├── if (req.file) data.inputImage =          ← convert file → data URL
  │     `data:${mimetype};base64,${buffer.toString('base64')}`
  └── pass data to generation.service          ← unchanged downstream
              │
              ▼
[generation.service.ts: saveInputImage]       ← unchanged, still takes data URL
[ai.service.ts]                               ← unchanged, vision-bridge flow
```

The JSON path is unchanged: if no file is uploaded, `req.file` is undefined, `data.inputImage` keeps whatever the caller put in the JSON body (a data URL or absent), and behavior is identical to before.

---

## API Contract Changes

### `POST /api/generations`

Now accepts **either** Content-Type:

**`application/json`** (existing, unchanged):
```json
{
  "prompt": "Modern minimalist living room",
  "style": "japandi",
  "aspectRatio": "16:9",
  "designId": "6a0b62c1c675d69bb7d8ae5d",
  "inputImage": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**`multipart/form-data`** (new):

| Field | Type | Required | Notes |
|---|---|---|---|
| `prompt` | text | ✅ | Same as JSON `prompt` |
| `style` | text | ❌ | `minimalist` / `modern` / `industrial` / `japandi` |
| `aspectRatio` | text | ❌ | `1:1` / `16:9` / `9:16` / `4:3` |
| `designId` | text | ❌ | If omitted/unknown, a new design is created |
| `referenceImage` | file | ❌ | `image/jpeg` / `image/png` / `image/webp`, max **15 MB** |

> The file field name on the wire is **`referenceImage`**, matching the frontend. Internally the controller stores it under the existing `inputImage` slot, so all downstream code (storage, vision bridge, persistence) is unchanged.

### `POST /api/generations/:id/regenerate`

Same dual-format support as `create`. Sending a new `referenceImage` replaces the previously stored input image on disk, same semantics as sending a new `inputImage` data URL in JSON.

### Responses

No changes — same `201` / `200` shapes as before.

---

## Files Touched

| File | Change |
|---|---|
| [src/modules/generations/generation.route.ts](../../src/modules/generations/generation.route.ts) | Imported `multer`, configured `memoryStorage` with 15 MB `fileSize` limit, mounted `upload.single('referenceImage')` on `POST /` and `POST /:id/regenerate`. |
| [src/modules/generations/generation.controller.ts](../../src/modules/generations/generation.controller.ts) | Added `fileToDataUrl` helper. `create` and `regenerate` now spread `req.body` into `data` and, when `req.file` is present, populate `data.inputImage` with a data URL. |
| [package.json](../../package.json) | Added `multer` (runtime) and `@types/multer` (dev). |

`generation.service.ts`, `image-storage.service.ts`, `ai.service.ts`, `generation.queue.ts`, `generation.model.ts`, and `generation.types.ts` are **unchanged** — the multipart wire format is fully absorbed at the edge.

---

## Limits & Configuration

| Limit | Where | Value |
|---|---|---|
| Multipart file size | [generation.route.ts](../../src/modules/generations/generation.route.ts) — multer `limits.fileSize` | 15 MB |
| JSON body size | [src/app.ts](../../src/app.ts) — `express.json({ limit })` | 15 MB |
| URL-encoded body size | [src/app.ts](../../src/app.ts) — `express.urlencoded({ limit })` | 15 MB |

The two image limits intentionally match. Raise both together if you want larger uploads.

No new environment variables.

---

## Examples

### JSON (existing)

```bash
curl -X POST http://localhost:3001/api/generations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Modern minimalist living room",
    "style": "japandi",
    "aspectRatio": "16:9"
  }'
```

### Multipart with reference image (new)

```bash
curl -X POST http://localhost:3001/api/generations \
  -H "Authorization: Bearer $TOKEN" \
  -F "prompt=Modern minimalist living room with warm lighting" \
  -F "style=japandi" \
  -F "aspectRatio=16:9" \
  -F "designId=6a0b62c1c675d69bb7d8ae5d" \
  -F "referenceImage=@./reference.jpeg;type=image/jpeg"
```

### Browser (frontend)

```ts
const fd = new FormData();
fd.append('prompt', prompt);
fd.append('style', style);
fd.append('aspectRatio', aspectRatio);
if (designId) fd.append('designId', designId);
if (referenceFile) fd.append('referenceImage', referenceFile);

await fetch('/api/generations', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }, // do NOT set Content-Type — browser sets the boundary
  body: fd,
});
```

---

## Verification

- ✅ `npm run typecheck` clean
- ✅ Empty-prompt guard still fires correctly when `prompt` is missing in either format
- ✅ JSON request without `inputImage` → behavior unchanged
- ✅ JSON request with `inputImage` data URL → behavior unchanged
- ✅ Multipart request without `referenceImage` → text-only generation
- ✅ Multipart request with `referenceImage` → vision-bridge runs, generation completes

---

## Known Issues / Future Considerations

1. **Re-encoding overhead**. The controller currently `buffer.toString('base64')` to feed `saveInputImage(dataUrl)`. For 10–15 MB uploads this is a few-ms per request. If it ever shows up in profiles, extend `saveInputImage` to accept a `{buffer, mimeType}` variant and pass the raw multer buffer through.

2. **Field-name asymmetry**. The wire field is `referenceImage`, the internal/service field is `inputImage`. Cheap mental tax for anyone reading both layers. Renaming everything to `referenceImage` (or aliasing on the frontend) would unify them. Deferred — current naming reflects historical order: `inputImage` came first via JSON, `referenceImage` is what the frontend shipped.

3. **No multipart MIME validation**. Multer accepts any file type under `referenceImage`. The decode validation lives in [image-storage.service.ts](../../src/modules/generations/image-storage.service.ts) (`decodeImageDataUrl` regex), which only allows `image/jpeg|png|webp`. A non-image upload will reach the service before being rejected — works, just slightly later than ideal. Add a `fileFilter` in the multer config if you want to fail at the edge.

4. **No virus / image-bomb scanning**. We accept and decode arbitrary user-uploaded binary in-process. Fine for the current free-tier interior-design workflow; revisit before opening to untrusted traffic.

5. **`multer` is deprecated 1.x line**. We're on the 1.x branch. 2.x is current. Upgrade is straightforward if/when needed.

---

## Summary

A 400 caused by a Content-Type mismatch turned into a small, edge-only adapter: multer parses multipart, the controller funnels `req.file` into the existing data-URL slot, and every layer downstream of the controller is byte-for-byte identical to before. The JSON contract still works, the frontend's multipart format now works, and no service- or storage-layer changes were needed.
