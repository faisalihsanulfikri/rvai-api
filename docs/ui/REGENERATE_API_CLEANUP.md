# Regenerate API Cleanup (Frontend Dead Code Removal)

**Date:** May 20, 2026
**Status:** Complete
**Scope:** Frontend only — backend endpoint left untouched

---

## Overview

Removed the unused `generations.regenerate()` wrapper from [lib/api.ts](../../lib/api.ts). The function targeted `POST /api/generations/:id/regenerate`, but the actual frontend "Regenerate" UX no longer goes through it — it's a pure navigation flow that prefills the generation form via query params, then calls `generations.create()` like any other new generation.

This change touches **frontend only**, per instruction. The backend `POST /api/generations/:id/regenerate` endpoint (if it still exists) was not modified — that's a separate decision.

---

## What Was Removed

[lib/api.ts](../../lib/api.ts) — deleted the following block:

```typescript
regenerate: async (
  id: string,
  prompt: string,
  style?: string,
  aspectRatio?: string,
  room?: string
): Promise<Generation> => {
  const body: Record<string, string> = { prompt }
  if (style) body.style = style
  if (aspectRatio) body.aspectRatio = aspectRatio
  if (room) body.room = room

  const gen = await apiFetch(`/api/generations/${id}/regenerate`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return normalizeGeneration(gen)
},
```

Remaining methods on `generations`: `create`, `list`, `get`, `delete`.

---

## Why It Was Dead

Grep across `app/` and `components/` confirmed zero callers of `generations.regenerate(...)`. The real Regenerate flow is:

1. User clicks **Regenerate** on a gallery card or detail page.
2. `<Link>` navigates to `/generate?prompt=...&image=...&style=...&room=...` (see [REGENERATE_ROUTE_FIX.md](./REGENERATE_ROUTE_FIX.md)).
3. [app/generate/page.tsx](../../app/generate/page.tsx) reads the query params and prefills the form.
4. User submits → calls `generations.create(...)` — a brand new generation, **not** a regenerate.

Net effect: the dedicated regenerate API call was bypassed entirely. Keeping the wrapper around just invited confusion about which path is canonical.

---

## Callers Audit (Post-Cleanup)

| File                                                                                     | Methods used                  |
| ---------------------------------------------------------------------------------------- | ----------------------------- |
| [app/gallery/[id]/page.tsx](../../app/gallery/[id]/page.tsx)                             | `get`, `delete`               |
| [app/gallery/page.tsx](../../app/gallery/page.tsx)                                       | `list`                        |
| [app/generate/page.tsx](../../app/generate/page.tsx)                                     | `list`, `get`, `create`       |

No file references `generations.regenerate` after this change.

---

## Trade-offs

- **Loss:** No longer have a direct client wrapper for `POST /api/generations/:id/regenerate`. If we later want a "true" regenerate (preserves linkage to the original generation ID, rather than creating an orphan via `create`), we'll need to re-add the wrapper or wire it through `create` with an extra `parentId` param.
- **Gain:** One less dead path. The "Regenerate = prefill form + create new" mental model is now the only model the frontend supports.

---

## Verification

- [x] Grep confirms no remaining callers of `.regenerate(` in `app/` or `components/`.
- [x] No new TypeScript errors introduced (pre-existing errors at [lib/api.ts:81](../../lib/api.ts#L81) and [lib/api.ts:118](../../lib/api.ts#L118) are unrelated).
- [ ] Smoke test the Regenerate buttons on gallery card + gallery detail to confirm the navigation flow still prefills `/generate` correctly.

---

## Follow-ups

- Decide whether `POST /api/generations/:id/regenerate` on the backend should be retired. If no other client uses it, it's also dead.
- If a true "regenerate same generation" flow is desired later (e.g., keeping a parent/child link in the data model), reintroduce the wrapper deliberately and wire UI calls to it.
