# Regenerate Route Fix

**Date:** May 20, 2026
**Commit:** b1da378
**Status:** Complete

---

## Overview

Fixed the "Regenerate" links so they navigate to the dedicated `/generate` page instead of the landing route `/`. The previous links dropped users on the home page, where the prefilled prompt/image/style/room query params were not consumed by the generation form.

---

## Files Changed

### 1. [app/gallery/[id]/page.tsx](../../app/gallery/[id]/page.tsx#L301)

Regenerate CTA on the gallery detail page now targets `/generate`.

```diff
- href={`/?prompt=${encodeURIComponent(generation.originalPrompt)}&image=...`}
+ href={`/generate?prompt=${encodeURIComponent(generation.originalPrompt)}&image=...`}
```

### 2. [components/image-card.tsx](../../components/image-card.tsx#L85)

Regenerate button on the shared image card (used across gallery grid and related lists) now targets `/generate`.

```diff
- href={`/?prompt=${encodeURIComponent(generation.originalPrompt)}&image=...`}
+ href={`/generate?prompt=${encodeURIComponent(generation.originalPrompt)}&image=...`}
```

### 3. tsconfig.tsbuildinfo

Incidental build artifact update from the TypeScript incremental compiler. No source impact.

---

## Query Parameters Preserved

The regenerate link continues to forward the full context to the generation form:

| Param    | Source                      | Required |
| -------- | --------------------------- | -------- |
| `prompt` | `generation.originalPrompt` | Yes      |
| `image`  | `generation.imageUrl`       | Yes      |
| `style`  | `generation.style`          | Optional |
| `room`   | `generation.room`           | Optional |

All values are passed through `encodeURIComponent`.

---

## Why This Matters

- `/generate` is the route that renders the generation form and reads the query params to prefill prompt, reference image, style, and room.
- Routing to `/` left the regenerate intent stranded — params were sent but never read.
- After this fix, clicking **Regenerate** from either the gallery detail page or any image card lands the user on the generation form with their original inputs already populated.

---

## Verification Checklist

- [ ] From `/gallery/[id]`, click **Regenerate** → lands on `/generate` with prompt, image, style, room prefilled.
- [ ] From any `ImageCard` (gallery grid, designs sidebar), click **Regenerate** → same behavior.
- [ ] Generation form correctly reads the query string and prefills inputs.
- [ ] No regression on download button or other card actions.
