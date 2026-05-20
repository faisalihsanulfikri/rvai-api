# Chat Bubble, Reference Image & Loading-State Fixes

**Date**: 2026-05-19
**Version**: v0.5.5
**Status**: ✅ Implemented

---

## What Changed

Four follow-ups on top of v0.5.4:

1. Chat bubble now displays `originalPrompt` (user's raw text) instead of the enhanced `finalPrompt`.
2. New **Copy** icon button under each prompt bubble.
3. Reference image is now sent on regenerate too — the remote image URL is fetched and re-wrapped as a `File`.
4. Prompt form's disabled state is now scoped to the **currently visible** design — clicking "+ New Design" or switching to a quiet design re-enables the form even when another generation is still processing in the background.

---

## 1. Chat bubble shows `originalPrompt`

The prompt bubble previously rendered `generation.finalPrompt` — the backend-enhanced text including style descriptors ("Reference scene: …, Style: modern", etc). That bloat is great for the image generator but noisy for users reading back their own message history.

### Change

| Field | Before | After |
|-------|--------|-------|
| Bubble text | `generation.finalPrompt` | `generation.originalPrompt` |
| `<Image alt>` | `generation.finalPrompt` | `generation.originalPrompt` |
| Copy button payload | (n/a) | `generation.originalPrompt` |

### Files touched

| File | Change |
|------|--------|
| [components/chat-message.tsx:58](../../components/chat-message.tsx#L58) | Bubble text → `originalPrompt` |
| [components/chat-message.tsx:89](../../components/chat-message.tsx#L89) | Image `alt` → `originalPrompt` |

---

## 2. Copy button under the prompt

Right-aligned icon-only button directly under the bubble. On click it copies `generation.originalPrompt` to the clipboard and swaps to a check icon for 1.5s.

```tsx
const [copied, setCopied] = useState(false)

const handleCopyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(generation.originalPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  } catch (error) {
    console.error('Copy failed:', error)
  }
}
```

Layout-wise, the wrapper switched from `flex justify-end` to `flex flex-col items-end gap-1` so the icon sits flush against the right edge of the bubble.

### Files touched

| File | Change |
|------|--------|
| [components/chat-message.tsx:7](../../components/chat-message.tsx#L7) | Imported `Copy`, `Check` from `lucide-react` |
| [components/chat-message.tsx:17-26](../../components/chat-message.tsx#L17-L26) | `copied` state + `handleCopyPrompt` |
| [components/chat-message.tsx:54-72](../../components/chat-message.tsx#L54-L72) | Wrapper layout + icon button |

---

## 3. Reference image works for regenerate too (`stringToFile`)

### The bug

After v0.5.4, `POST /api/generations` uploaded the reference image via `multipart/form-data` whenever the form had one. But the regenerate flow drops a *remote URL* into the form (e.g. `http://localhost:3001/api/images/xyz.jpg`), not a data URL. The old `dataUrlToFile` regex requires a `data:` prefix, so it returned `null` and the request silently fell back to JSON without an image.

### The fix

A new `stringToFile` helper in [lib/api.ts:84-97](../../lib/api.ts#L84-L97):

```ts
async function stringToFile(value: string, filename = 'reference'): Promise<File | null> {
  if (value.startsWith('data:')) return dataUrlToFile(value, filename)
  try {
    const response = await fetch(value)
    if (!response.ok) return null
    const blob = await response.blob()
    const mime = blob.type || 'application/octet-stream'
    const ext = (mime.split('/')[1] || 'bin').split('+')[0]
    return new File([blob], `${filename}.${ext}`, { type: mime })
  } catch {
    return null
  }
}
```

`generations.create` now awaits this instead of the sync helper:

```diff
- ? dataUrlToFile(referenceImage)
+ ? await stringToFile(referenceImage)
```

### Resulting matrix

| Form image source | Path taken | Backend receives |
|-------------------|-----------|------------------|
| User-picked `File` (file input) | Used directly | `referenceImage` file part |
| Data URL (initial `imageDataUrl` from edit) | `dataUrlToFile` | `referenceImage` file part |
| Remote URL (regenerate-from-history flow) | `fetch` → `Blob` → `File` | `referenceImage` file part |
| (no image) | — | JSON request, no image |

### Caveat

The remote-URL branch depends on a successful cross-origin `GET` against the image host. The image is served by the same API as the rest of the requests (`localhost:3001`) and authenticated views already work, so CORS should not be a blocker — but worth noting if the asset is ever moved behind a stricter origin.

### Files touched

| File | Change |
|------|--------|
| [lib/api.ts:84-97](../../lib/api.ts#L84-L97) | New `stringToFile()` helper |
| [lib/api.ts:141](../../lib/api.ts#L141) | `await stringToFile(referenceImage)` inside `generations.create` |

---

## 4. Prompt form: disable only when the *current* design is busy

### The bug

`isLoading` was a single page-level flag. Once set, it stayed `true` until the polling for that generation resolved. So if a user kicked off a generation and immediately clicked "+ New Design" or jumped to another (idle) design, the form stayed disabled even though nothing was processing in the visible thread.

### The fix

Both navigation handlers in [app/page.tsx:231-253](../../app/page.tsx#L231-L253) now reset / recompute the flag based on what the user is about to see:

```ts
const handleNewChat = () => {
  …
  setIsLoading(false)        // fresh empty thread ⇒ always enabled
}

const handleSelectDesign = (designId: string) => {
  …
  const next = generationsByDesign[designId] ?? []
  setThreadMessages(next)
  …
  setIsLoading(
    next.some((g) => g.status === 'pending' || g.status === 'processing')
  )
}
```

The previous design's polling timer is already cleared in both handlers via `clearInterval(pollingRef.current)`, so background work doesn't keep firing.

### Behavior matrix

| User action | Form state after |
|-------------|------------------|
| Click "+ New Design" while another design is still processing | ✅ Enabled |
| Click a different design whose generations are all `success` / `failed` | ✅ Enabled |
| Click a different design that still has a `processing` generation | ❌ Disabled (correct — that design is busy) |
| Stay on the active design while it's processing | ❌ Disabled (unchanged) |

### Known limitation (not addressed)

Polling for the *previous* design's in-flight generation is stopped, not transferred. If you leave a design mid-generation and come back later, you'll see whatever snapshot was in `generationsByDesign` at switch time, not the latest status. This was true before v0.5.5 too; recommended follow-up is to spawn one poller per processing generation rather than tying it to the visible thread.

### Files touched

| File | Change |
|------|--------|
| [app/page.tsx:239](../../app/page.tsx#L239) | `setIsLoading(false)` on "+ New Design" |
| [app/page.tsx:244-253](../../app/page.tsx#L244-L253) | Recompute `isLoading` from the target design's generations |

---

## Verification

- Open a design and trigger generation → form disables.
- Click "+ New Design" mid-generation → form re-enables instantly; typing + submitting starts a new design correctly.
- Click a *different* idle design mid-generation → form re-enables.
- Click a design that itself has a processing gen → form stays disabled.
- Click the regenerate (RotateCcw) overlay → form pre-fills with `originalPrompt`; submitting → Network panel → request goes out as `multipart/form-data` with `referenceImage` as a real file part (mime e.g. `image/jpeg`).
- Click the copy icon under a bubble → clipboard contains the raw prompt (no "Style: …" tail); icon flips to ✓ for ~1.5s.

---

## Follow-ups (not done)

- Persist per-generation polling so that backgrounded designs eventually move from `processing` → `success` in `generationsByDesign` even when the user isn't looking at them.
- Show a small `⏳` indicator on sidebar entries whose generations are still processing.
- Add a "Copy" button to the gallery detail page for parity.
