# Niche-Shaped Setup: Photo + Structured Inputs

**Date**: 2026-05-20
**Version**: v0.6.0
**Status**: ✅ Implemented (UI + prompt composition); ⚠️ image-pipeline backend work still pending

---

## Why

Before this change, the empty-state was a ChatGPT-style hero ("Ready when you are.") with a single freeform textarea. The product looked — and behaved — like a generic image-gen wrapper that happened to be labelled "interior design." Nothing in the flow knew it was a room.

This change is the first step of the *niche shift*: make the room photo the primary input, replace freeform prompting with structured pickers (room type, style, mode), and stop forcing previews into a fixed 16:9 crop.

---

## What Changed

1. New empty-state **Design Setup** form — large photo dropzone, room/style chip pickers, optional notes textarea.
2. `PromptInput` carries structured intent (`roomType`, `style`, `mode`) end-to-end.
3. First-generation prompt is now *composed* from structured fields (no more hardcoded `'japandi'`).
4. The "Ready when you are" hero and the bottom `PromptForm` are hidden on the empty state — replaced by the structured form. The bottom textarea returns once a thread exists, for follow-up tweaks.
5. Chat preview is no longer locked to 16:9 — images render at their natural aspect ratio.

---

## 1. New `DesignSetup` component

[components/design-setup.tsx](../../components/design-setup.tsx)

A self-contained form rendered as the empty-state entry point.

### Anatomy

```
┌──────────────────────────────────────────────┐
│              Set up your design              │
│   Upload your room to redesign it, or skip   │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  📤  Drop a photo of your room         │  │
│  │      or click to upload · ≤ 5MB        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Room                          Living Room   │
│  [Living Room][Bedroom][Kitchen][Bathroom]   │
│  [Home Office][Dining Room]                  │
│                                              │
│  Style                              Japandi  │
│  [Japandi][Modern][Minimalist][Industrial]   │
│                                              │
│  Anything specific? (optional)               │
│  ┌────────────────────────────────────────┐  │
│  │ e.g. keep the windows, warm oak floors │  │
│  └────────────────────────────────────────┘  │
│                                              │
│           [✨ Redesign my room]              │
└──────────────────────────────────────────────┘
```

### Behaviour

- **Photo dropzone** supports both click-to-upload and drag-and-drop. 5MB cap, image MIME check, preview-with-X-to-remove. While dragging, the border highlights primary.
- **Mode is derived from the photo state**:
  - Photo present → `mode = 'redesign'`, button says **"Redesign my room"**, overlay caption *"Redesign mode — layout will be preserved"* sits on the preview.
  - No photo → `mode = 'fresh'`, button says **"Generate room"**.
- **Chip selectors** for room and style. Selected chip = solid dark fill; others = bordered. Defaults: `living-room`, `japandi`.
- **Notes** textarea is optional. The structured fields alone are enough to submit.

### Prompt composition

On submit, `composePrompt()` builds the final text payload from the structured fields:

```
{Style}-style {room}. {modeText}

Specific requests: {notes}
```

Example with photo + notes:

> Japandi-style living room. Redesign the existing room in the reference photo — preserve the original layout, windows, doors, and architectural features.
>
> Specific requests: keep the bay window, warm oak floors.

Example without photo, no notes:

> Modern-style bedroom. Generate a fresh interior visualization from scratch.

This composed text is what goes to `generations.create(...)` as the `prompt`. The chosen style is also passed in the dedicated `style` field so the backend's existing style routing still applies.

---

## 2. Type-level changes

[types/index.ts](../../types/index.ts)

```ts
export type RoomType =
  | 'living-room'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'home-office'
  | 'dining-room';

export type DesignStyle = 'minimalist' | 'modern' | 'industrial' | 'japandi';

export type DesignMode = 'redesign' | 'fresh';

export interface PromptInput {
  text: string;
  imageFile?: File;
  imageDataUrl?: string;
  roomType?: RoomType;        // NEW
  style?: DesignStyle;        // NEW
  mode?: DesignMode;          // NEW
}
```

`DesignStyle` is intentionally aligned with `Generation.style`'s existing union so no backend changes are required to accept the chip values.

---

## 3. `app/page.tsx` wiring

| Before | After |
|--------|-------|
| `Sparkles` hero + bottom `PromptForm` in empty state | `DesignSetup` in empty state; bottom `PromptForm` hidden until a thread exists |
| `handleGenerateFirst` hardcoded `style: 'japandi'` | Uses `input.style ?? 'japandi'` — picks up the chip selection |
| Single shared `PromptForm` for first + follow-up | First message goes through `DesignSetup`; follow-ups still use `PromptForm` for chat-style tweaking |

Relevant lines:

- [app/page.tsx:336-338](../../app/page.tsx#L336) — empty state now renders `<DesignSetup ...>`.
- [app/page.tsx:370-388](../../app/page.tsx#L370) — bottom `PromptForm` wrapped in `{threadMessages.length > 0 && ...}`.
- [app/page.tsx:129](../../app/page.tsx#L129) — `chosenStyle = input.style ?? 'japandi'`, threaded through both the optimistic `Generation` and the `generations.create` call.

`handleGenerateNext` still uses the existing chat-style flow — structured pickers are only for the *first* message of a design thread, since by then the design's intent is set.

---

## 4. Preview is no longer forced to 16:9

[components/chat-message.tsx](../../components/chat-message.tsx)

The success-state container previously hard-coded `aspectRatio: '16/9'` on the wrapper and used `object-cover` on the image — which meant any non-16:9 generation was cropped in preview.

### Change

| Element | Before | After |
|---------|--------|-------|
| Wrapper | `w-full max-w-2xl` + `style={{ aspectRatio: '16/9' }}` | `inline-block max-w-2xl` (no aspect ratio) |
| Image | `next/image` with fixed `width=1280 height=720` and `object-cover` | plain `<img>` with `block w-auto max-w-full h-auto max-h-[70vh]` |
| Overlay | `absolute inset-0 ... rounded-lg` | `absolute inset-0` (border-radius inherits from wrapper) |
| `next/image` import | imported and used | removed |

The image now renders at its **natural aspect ratio**, capped at the chat column width (`max-w-2xl`) and `max-h-[70vh]` for tall portraits.

The 16:9 is still **requested** from the API — only the *preview rendering* is flexible. The backend can choose to return whatever it likes.

---

## Files Touched

| File | Change |
|------|--------|
| [types/index.ts](../../types/index.ts) | Added `RoomType`, `DesignStyle`, `DesignMode`; extended `PromptInput` |
| [components/design-setup.tsx](../../components/design-setup.tsx) | **NEW** — structured first-message form |
| [app/page.tsx](../../app/page.tsx) | Empty state → `DesignSetup`; hide bottom `PromptForm` until thread exists; thread chosen style through `handleGenerateFirst` |
| [components/chat-message.tsx](../../components/chat-message.tsx) | Drop fixed 16:9; use `<img>` with natural aspect ratio |

No backend changes were required.

---

## Important Caveat: "Redesign Mode" is still text-only

Currently, "preserve the layout" is only a phrase in the composed prompt. The image model will do its best, but **the original photo's structure is not actually masked, segmented, or constrained**. To make redesign mode genuinely niche-shaped, the next backend step is:

- Route the reference image through an img2img / inpainting pipeline (ControlNet depth/segmentation, or equivalent) so walls, windows, perspective, and architecture are *actually* preserved
- Optionally surface a per-surface mask UI (this wall, this floor, this sofa) on the result for targeted edits

The frontend already feeds the model the right structured intent — the backend just has to honour it.

---

## What This Unlocks Next

Now that structured intent is captured in `PromptInput`, the obvious next moves are:

1. **Shoppable output** — detect objects in the generated image, link to real products with prices. The actual moat; no generic wrapper does this.
2. **Surface-aware edits** on the result — mask a wall, swap a sofa, repaint just one surface (requires backend masking).
3. **Per-room project model** — rename "designs" to "rooms" inside a project (a project = a home). The chat metaphor is wrong for interior design; iteration on a *space* is right.
4. **Before/after slider** on the user's original photo — the single most shareable artifact a homeowner produces.
5. **More styles + materials library** — once redesign mode is real, structured material/finish pickers (white oak, brushed brass, terrazzo) become the natural next chip row.
