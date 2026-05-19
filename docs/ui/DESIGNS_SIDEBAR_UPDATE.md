# Designs Sidebar + Logout Redirect

**Date**: 2026-05-19
**Version**: v0.5.3
**Status**: ✅ Implemented

---

## What Changed

Two related frontend changes:

1. The home-page sidebar now lists **designs** (from `GET /api/designs`) instead of raw generations.
2. Clicking the logout button now forces a redirect to `/login`.

These follow the backend rollout documented in [docs/api/DESIGNS_FEATURE.md](../api/DESIGNS_FEATURE.md), which introduced a `Design` collection grouping one or more `Generation` records.

---

## 1. Sidebar: from generations → designs

### Before

The sidebar in [app/page.tsx](../../app/page.tsx) built its list from `generations.list()` and treated each generation as its own "thread":

```ts
const gens = await generations.list()
const threads: Record<string, Generation[]> = {}
gens.forEach(gen => { threads[gen.id] = [gen] })
setAllThreads(threads)
```

Each sidebar entry was labeled with `finalPrompt` of a single generation. Multiple regenerations under the same intent showed up as separate, nearly-identical entries.

### After

The sidebar now fetches `Design[]` and groups generations by `designId` for fast thread switching:

```ts
const [designList, gens] = await Promise.all([
  designsApi.list(),
  generations.list(),
])
setDesigns(designList)

const grouped: Record<string, Generation[]> = {}
gens.forEach(g => {
  if (!g.designId) return
  if (!grouped[g.designId]) grouped[g.designId] = []
  grouped[g.designId].push(g)
})
// Oldest first inside each design so the chat reads top-down
Object.values(grouped).forEach(list =>
  list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
)
setGenerationsByDesign(grouped)
```

Each sidebar entry is now a `Design`, labeled with `firstPrompt`.

### Threading behavior

- **First prompt of a thread** (`handleGenerateFirst`): omits `designId`. The backend creates a fresh `Design`, returns its id on the new generation, and the UI captures it into `currentDesignId`.
- **Follow-up prompts** (`handleGenerateNext`): pass `currentDesignId` so the new generation attaches to the same design.
- **"+ New Design"** button (`handleNewChat`): clears `currentDesignId` and the thread — next prompt starts a new design.
- **Clicking a design** (`handleSelectDesign`): sets `currentDesignId` and loads `generationsByDesign[id]` into the chat area.

### Files touched

| File | Change |
|------|--------|
| [types/index.ts](../../types/index.ts) | Added `Design` interface; added optional `designId` to `Generation` |
| [lib/api.ts](../../lib/api.ts) | Added `designs.list()`; `generations.create` now takes an optional 4th `designId` argument |
| [app/page.tsx](../../app/page.tsx) | Sidebar reads designs; state refactored from `allThreads` + `threadId` to `designs` + `generationsByDesign` + `currentDesignId` |

### API surface used

| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/designs` | Load sidebar on mount; refresh after first prompt creates a new design |
| GET | `/api/generations` | Build the `designId → generations` map for fast thread switching |
| POST | `/api/generations` | Body now includes `designId` for follow-up prompts |

---

## 2. Logout: force redirect to `/login`

### The bug

Clicking the logout icon in the header cleared auth state but left the user stranded on the current page. Middleware would redirect on the next navigation, but until then the UI looked broken — empty sidebar, no user info, still on `/`.

### The fix

[components/header.tsx](../../components/header.tsx) wraps the context `logout` in a local `handleLogout` that navigates after the cleanup completes:

```ts
const router = useRouter()
const { user, isAuthLoading, login, logout } = useAuth()

const handleLogout = async () => {
  await logout()             // clears localStorage + cookie + context state
  router.replace('/login')   // hop to /login (no back-stack entry)
  router.refresh()           // re-run server components, re-trigger middleware
}
```

The logout button is wired to `handleLogout` instead of the raw `logout`.

### Why this works

- The auth context already clears `auth_token` from both `localStorage` and the cookie ([context/auth-context.tsx:48-58](../../context/auth-context.tsx#L48-L58)).
- Middleware ([middleware.ts](../../middleware.ts)) allows `/login` when no cookie is present, so the redirect lands cleanly.
- `router.replace` rather than `push` keeps the back button from returning the user to the now-unauthenticated app shell.
- `router.refresh` invalidates any cached server-component data that might still reference the signed-in user.

---

## Verification

- `npx tsc --noEmit` — no new errors (one pre-existing `verifyGoogle` return-type mismatch in `lib/api.ts` is unrelated).
- Sidebar loads designs newest-first.
- New prompt → new sidebar entry appears (refresh of `designs.list()` after `generations.create`).
- Follow-up prompt → no new sidebar entry; chat continues under the same design.
- Logout → immediate hop to `/login`, no stuck UI.

---

## Follow-ups (not done)

- A dedicated `GET /api/designs/:id/generations` endpoint would let the sidebar load lazily per design instead of fetching every generation up front.
- Showing a per-design generation count and timestamp in the sidebar.
- Renaming a design (editing `firstPrompt`).
- Deleting a design with cascade.
