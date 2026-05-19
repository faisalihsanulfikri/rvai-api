# Sidebar, Prompt-Form & Regenerate Improvements

**Date**: 2026-05-19
**Version**: v0.5.4
**Status**: ✅ Implemented

---

## What Changed

A batch of UX and API-payload improvements layered on top of v0.5.3:

1. Sidebar design entries truncate to a single line.
2. Sidebar gained an "All chats" collapse/expand toggle.
3. Prompt form clears its text + reference image when switching designs (but **not** when re-clicking the active design).
4. `POST /api/generations` now uploads the reference image as a real file via `multipart/form-data`.
5. All "Regenerate" entry points pre-fill the form with `originalPrompt` instead of the enhanced `finalPrompt`.

---

## 1. Sidebar: single-line design titles

### Before

```tsx
className="… line-clamp-2"
```

Each sidebar entry wrapped to two lines, which still left half-visible third lines underneath when the design title was long.

### After

```tsx
className="… truncate"
```

`truncate` resolves to `text-overflow: ellipsis; white-space: nowrap; overflow: hidden;` — one line, ellipsis on overflow.

### Files touched

| File | Change |
|------|--------|
| [app/page.tsx](../../app/page.tsx#L275) | `line-clamp-2` → `truncate` on the design-entry button |

---

## 2. Sidebar: "All chats" collapse/expand toggle

A pill-shaped toggle now sits above the list. Clicking it hides/shows every design entry; the chevron rotates `-90°` when collapsed.

```tsx
<button
  onClick={() => setIsDesignListExpanded((v) => !v)}
  aria-expanded={isDesignListExpanded}
>
  <span>All chats</span>
  <ChevronDown className={isDesignListExpanded ? '' : '-rotate-90'} />
</button>

{isDesignListExpanded && designs.map(...)}
```

State defaults to expanded (`useState(true)`). Empty-state copy ("No designs yet") is also gated behind the expanded flag so a collapsed list is fully empty.

### Files touched

| File | Change |
|------|--------|
| [app/page.tsx:8](../../app/page.tsx#L8) | Added `ChevronDown` to the `lucide-react` import |
| [app/page.tsx:24](../../app/page.tsx#L24) | `isDesignListExpanded` state |
| [app/page.tsx:271-305](../../app/page.tsx#L271-L305) | Toggle button + conditional list |

---

## 3. Prompt form auto-clear on design switch

### The problem

After typing a prompt or picking a reference image, clicking another design left those values stuck in the form. The form's internal state (text + `imagePreview` + `imageFile`) does not re-derive from props unless `initialPrompt` / `initialImageDataUrl` literally change references, so resetting parent state alone was not enough when the user had typed into the textarea themselves.

### The fix

Introduced a `formResetKey` counter on the page. Every event that should clear the form bumps the counter, which is passed as `<PromptForm key={formResetKey} … />`, forcing React to remount the form with a clean slate.

```tsx
const [formResetKey, setFormResetKey] = useState(0)

const handleNewChat = () => {
  …
  setEditingPrompt('')
  setEditingImageDataUrl('')
  setFormResetKey((k) => k + 1)
}

const handleSelectDesign = (designId: string) => {
  if (designId === currentDesignId) return     // re-click ⇒ keep form
  …
  setEditingPrompt('')
  setEditingImageDataUrl('')
  setFormResetKey((k) => k + 1)
}
```

### Behavior matrix

| Action | Form cleared? |
|--------|---------------|
| Click "+ New Design" | ✅ Yes |
| Click a *different* design in the sidebar | ✅ Yes |
| Click the *currently selected* design | ❌ No (early-return) |

### Files touched

| File | Change |
|------|--------|
| [app/page.tsx:28](../../app/page.tsx#L28) | `formResetKey` state |
| [app/page.tsx:223-241](../../app/page.tsx#L223-L241) | `handleNewChat` / `handleSelectDesign` clear editing state + bump key |
| [app/page.tsx:356](../../app/page.tsx#L356) | `<PromptForm key={formResetKey} …/>` |

---

## 4. Reference image now uploaded as a file (multipart/form-data)

### Why

Previously `POST /api/generations` shipped only `{ prompt, style, aspectRatio, designId }` as JSON — the picked image was never sent. Aligning with the convention in [IMAGE_INPUT_SUPPORT.md](./IMAGE_INPUT_SUPPORT.md#L390-L402): the backend expects a `referenceImage` file part on a `multipart/form-data` request.

### Request flow

```
PromptForm onGenerate({ text, imageFile, imageDataUrl })
        ↓
generations.create(prompt, style, aspectRatio, designId, imageFile ?? imageDataUrl)
        ↓
  ┌────────────────────────────────────────────┐
  │ if (referenceImage)                        │
  │   File? → use directly                     │
  │   string (data URL)? → dataUrlToFile()     │
  │   → multipart/form-data with `referenceImage` │
  │ else                                       │
  │   → application/json (unchanged shape)     │
  └────────────────────────────────────────────┘
```

### `dataUrlToFile` helper

Reconstructs a real `File` object when the form only has a data URL (the "edit image / regenerate" flow stuffs a data URL into the form, not a `File`). Parses the data URL with a regex, decodes base64 (or `decodeURIComponent` for non-base64), and builds the `File` with the original MIME type so the backend sees a proper extension.

```ts
function dataUrlToFile(dataUrl, filename = 'reference'): File | null { … }
```

### `apiFetch` change

The shared `apiFetch` now omits the `Content-Type: application/json` header when the body is a `FormData` instance, letting the browser set its own multipart boundary:

```ts
const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
headers: {
  ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  …
}
```

### Files touched

| File | Change |
|------|--------|
| [lib/api.ts:12-29](../../lib/api.ts#L12-L29) | `apiFetch` skips JSON `Content-Type` for `FormData` |
| [lib/api.ts:65-82](../../lib/api.ts#L65-L82) | New `dataUrlToFile()` helper |
| [lib/api.ts:113-152](../../lib/api.ts#L113-L152) | `generations.create` accepts `File \| string` and posts multipart when present |
| [app/page.tsx:147-153, 205-211](../../app/page.tsx#L147) | Both handlers pass `input.imageFile ?? input.imageDataUrl` |

### Payload shape

When an image is present (`Content-Type: multipart/form-data; boundary=…`):

```
prompt: "Elegant luxury hotel lobby…"
style: "japandi" | "modern"
aspectRatio: "16:9"
designId: <optional>
referenceImage: <File> (image/png, image/jpeg, …)
```

When no image is present, request stays JSON exactly as before.

---

## 5. Regenerate uses `originalPrompt`, not `finalPrompt`

### Why

`finalPrompt` is the backend-enhanced version (style descriptors, lighting words, "ultra realistic architectural render" tail, etc.). Pre-filling it back into the form double-encoded style on the next generation, drifting the result. `originalPrompt` is what the user actually typed.

### Entry points updated

| File | Trigger | Change |
|------|---------|--------|
| [components/chat-message.tsx:38](../../components/chat-message.tsx#L38) | `RotateCcw` overlay button on a generated image | `onEdit(originalPrompt, imageUrl)` |
| [components/image-card.tsx:66](../../components/image-card.tsx#L66) | "Regenerate" button on gallery grid cards | `/?prompt=${originalPrompt}&image=…` |
| [app/gallery/[id]/page.tsx:303](../../app/gallery/[id]/page.tsx#L303) | "Regenerate Design" CTA on the gallery detail page | `/?prompt=${originalPrompt}&image=…` |

### Backwards compatibility note

Existing generations in the database already have both fields populated, so no migration is required. Older designs whose `originalPrompt` was never captured separately will simply show the same text as before; the only behavioral change is for the new flow.

---

## Verification

- Sidebar long titles → ellipsis on one line.
- Toggle button → list collapses; chevron rotates; clicking again re-expands.
- Click "+ New Design" with a typed prompt + picked image → form empties.
- Click a different design → form empties.
- Click the currently active design → form keeps text and image.
- Generate with a picked file → DevTools → Network → request payload is `multipart/form-data` with a `referenceImage` file part.
- Generate via regenerate flow (no `File`, only data URL) → still goes out as multipart; payload tab shows `referenceImage` as a binary part.
- Click chat regenerate / gallery regenerate → form is pre-filled with the raw prompt only (no "ultra realistic …" tail).

---

## Follow-ups (not done)

- Backend confirmation that `referenceImage` is being stored / used by the worker — frontend now sends it but worker behavior is out of scope here.
- Persisting the `isDesignListExpanded` toggle (e.g. `localStorage`) so the sidebar remembers its state across reloads.
- Showing a per-design generation count next to the truncated title.
