# Public Landing Page + `/generate` Route Move

**Date**: 2026-05-20
**Version**: v0.7.0
**Status**: ✅ Implemented

---

## Why

The app had no marketing surface — visiting `/` either dropped you straight into the generate flow or bounced you to `/login`. There was nowhere to show prospects what RoomVision AI does before asking them to sign in.

This change splits the two concerns:

- `/` is now a public landing page (warm interior-design aesthetic, inspired by the reference mockup the user provided).
- `/generate` owns the existing chat-style generation app, still auth-gated.

---

## What Changed

1. **New public landing page** at `/` with hero, stats bar, "Our Work Procedure," "Who We Are," showcase grid, final CTA, and footer.
2. **Generate app moved** from `/` → `/generate` (no behavior change, just a new URL).
3. **Middleware** updated to allow `/` without an auth token; `/generate` and everything else still require it.
4. **Login page** now pushes to `/generate` after a successful sign-in (was `/`).
5. **Header** gained a "Home" link; "Generate" now points to `/generate`; the "Sign in" button is a `Link` to `/login` instead of a direct OAuth jump, so users can see the login screen first.

---

## Files Touched

| File | Change |
|---|---|
| [app/page.tsx](../../app/page.tsx) | Replaced with the landing page. Still client-side because it catches `?token=…` OAuth redirects and forwards into `/generate`. |
| [app/generate/page.tsx](../../app/generate/page.tsx) | New file — verbatim copy of the previous home page, with the post-OAuth redirect target changed from `/` to `/generate`. |
| [middleware.ts](../../middleware.ts) | Added `/` to `publicRoutes`. |
| [components/header.tsx](../../components/header.tsx) | Added Home link; Generate link → `/generate`; Sign in button wraps `Link href="/login"`. |
| [app/login/page.tsx](../../app/login/page.tsx) | Post-login `router.push('/generate')` (both the success handler and the already-logged-in redirect). |

---

## Landing Page Structure

```
┌──────────────────────────────────────────────┐
│  Header  [Home] [Generate] [Gallery] [Sign in]│
├──────────────────────────────────────────────┤
│                                              │
│   HERO                                       │
│   "BUILD YOUR ELEGANT DREAM HOME INTERIOR"   │
│   [Start generating →] [See gallery]         │
│                       + hero image + floating│
│                         AI Design / Try Now  │
│                         cards                │
│                                              │
├──────────────────────────────────────────────┤
│   STATS:  4 · 6 · 30s · ∞                    │
│   Styles · Rooms · Avg gen · Iterations      │
├──────────────────────────────────────────────┤
│   OUR WORK PROCEDURE                         │
│   01 Upload  ·  02 Prompt  ·  03 Generate    │
├──────────────────────────────────────────────┤
│   WHO WE ARE                                 │
│   image + 3-bullet checklist + CTA           │
├──────────────────────────────────────────────┤
│   SHOWCASE — 4 sample interior renders       │
├──────────────────────────────────────────────┤
│   FINAL CTA on dark stone background         │
├──────────────────────────────────────────────┤
│   FOOTER                                     │
└──────────────────────────────────────────────┘
```

### Palette
Warm beige cards (`#f7f1e8`) on a cream page (`#f3ece2`) with `stone-900` text and the existing accent gold (`--accent: 42 84% 60%`) on the final CTA. No new tokens added.

### Images
Reuses Unsplash photo IDs already wired into [lib/dummy-data.ts](../../lib/dummy-data.ts), so no `next.config.js` change was needed:

- Hero: `photo-1631049307264-da0ec9d70304`
- Who-we-are: `photo-1502672260266-1c1ef2d93688`
- Showcase: 4 verified IDs from the dummy data

The hero went through one swap: the original `photo-1556909114-f6e7ad7d3136` turned out to contain people, so it was replaced with the bedroom shot.

---

## Auth Flow After This Change

| Visitor state | URL hit | Result |
|---|---|---|
| Logged out | `/` | Renders landing (public). |
| Logged out | `/generate` | Middleware redirects to `/login`. |
| Logged out | `/login` | Renders Google login. |
| Logged in | `/login` | Middleware redirects to `/`. |
| Logged in | `/` | Renders landing (with user chip in header). |
| Logged in | `/generate` | Renders the generate app. |
| Backend OAuth callback | `/?token=…` | Landing catches the token, stores it, then `router.replace('/generate')`. |

The `?token=…` handler was duplicated onto the landing as a defense-in-depth measure — if the backend was originally configured to redirect to `/`, links won't break. The new login page also redirects to `/generate` after `verifyGoogleToken` completes, so most flows never hit `/?token=…` at all.

---

## Stats Bar Numbers

Pulled from the source of truth, not invented:

- **4 Design styles** — from [types/index.ts](../../types/index.ts): `'minimalist' | 'modern' | 'industrial' | 'japandi'`.
- **6 Room types** — from `RoomType`: `living-room`, `bedroom`, `kitchen`, `bathroom`, `home-office`, `dining-room`.
- **30s Avg generation** — kept from the original mock (user request).
- **∞ Iterations** — true: regenerate as many times as desired.

---

## Known Mismatch / Follow-up

The landing claims **6 room types**, but [components/design-setup.tsx:19-23](../../components/design-setup.tsx#L19-L23) only exposes 3 chips today (Living Room, Bedroom, Kitchen). The data model supports the other 3 (Bathroom, Home Office, Dining Room) but the UI doesn't surface them. Either:

- Add the missing 3 chips to `ROOMS` in `design-setup.tsx`, or
- Drop the landing claim back to **3 Room types**.

This was left as-is because the user explicitly asked for "6 Room types" in the stats bar.

---

## Verification

- `npm run dev` compiles cleanly.
- `GET /` → 200, renders landing without an auth cookie.
- `GET /generate` (no cookie) → 307 → `/login`.
- `GET /generate` (with cookie) → 200, renders the generate app.
- The two pre-existing TypeScript errors in `lib/api.ts` (lines 81 and 118) are unchanged by this work.

---

**Author note**: thematic and routing change only — no changes to the generation pipeline, API contract, or auth context behavior.
