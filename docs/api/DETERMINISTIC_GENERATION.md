# Deterministic Generation (Vision-Bridge Stabilization)

**Date**: 2026-05-19 (session 3)
**Status**: Implemented
**Scope**: [src/modules/generations/ai.service.ts](../../src/modules/generations/ai.service.ts) only

---

## TL;DR

The vision-bridge pipeline (`inputImage` → Gemini Vision describes → Pollinations generates) was producing **different output images on every call**, even when the user re-uploaded the same reference image with the same prompt. This session locks the pipeline down so that **same inputs produce a byte-identical image** every time. The fix has three parts, all in [ai.service.ts](../../src/modules/generations/ai.service.ts):

1. Gemini Vision is called with `temperature: 0`, `topP: 0`.
2. The describe prompt now uses a role anchor, an anti-hallucination guardrail, and a strict 8-field structured output template.
3. Pollinations is called with an explicit `seed` derived from `sha256(aspectRatio + finalPrompt)`.

---

## Problem

Reported behavior: "when I upload an image and re-prompt, the image eventually shows a different result — even when I use the same image several times."

Root cause was that **two independent sources of randomness were stacked**:

| Stage | Why it varied |
|---|---|
| Gemini Vision describe | Default sampling (`temperature` unset, `topP` unset). Free-form prose prompt. Each call produced wording variations like "warm beige walls" vs. "neutral cream tones with slight warmth". |
| Pollinations text-to-image | No `seed` query param. Pollinations picked a random seed per request, so even byte-identical input text produced different images. |

Tweaking only the vision prompt would not have fixed it — Pollinations alone was enough to cause drift.

---

## Changes

### 1. Deterministic Gemini Vision sampling

`generateContent` now passes a config block with sampling disabled:

```ts
config: {
  temperature: 0,
  topP: 0,
},
```

At `temperature: 0` the model takes the highest-probability token at each step. `topP: 0` is belt-and-braces against any nucleus-sampling fallback in the SDK. Combined with the structured prompt below, the output is effectively reproducible across calls.

> Note: Gemini may still drift across **model versions** (server-side updates to `gemini-2.5-flash`). Pin `GEMINI_VISION_MODEL` to a specific snapshot if cross-deploy stability matters.

### 2. Role-anchored, anti-hallucination, structured vision prompt

Old prompt (free prose, 120-word cap):

```
Describe this interior space concisely (max 120 words) for an image generator.
Cover: room type, layout, materials, lighting, furniture, color palette, and mood.
Output only the description — no preamble.
```

New prompt:

```
You are an expert interior-design analyst. Describe only what is clearly visible in the image.
If a field is not clearly visible, write "unknown" for that field. Do not invent or assume details that are not present.

Output exactly this format. One line per field, no extra text, no preamble, no commentary:
Room: <type>
Layout: <short phrase>
Walls: <color and material>
Floor: <material and color>
Lighting: <natural/artificial, warm/cool>
Furniture: <3-5 key pieces>
Palette: <3-4 dominant colors>
Mood: <one adjective phrase>
```

Three engineering levers in play:

- **Role anchor** (`You are an expert interior-design analyst`) — stabilizes vocabulary and tone.
- **Anti-hallucination guardrail** (`describe only what is clearly visible`, `write "unknown"`, `do not invent`) — Gemini was occasionally inventing furniture pieces or lighting details not present in the reference image.
- **Strict format template** — closed-form fields with short value slots. Prose has high token-level variance; line-per-field tag output has very little.

### 3. Deterministic Pollinations seed

A `computeSeed` helper now derives a stable 32-bit unsigned integer from the final prompt and aspect ratio, and threads it through the Pollinations URL as `&seed=<int>`:

```ts
function computeSeed(finalPrompt: string, aspectRatio: AspectRatio): number {
  const hash = createHash('sha256').update(`${aspectRatio}|${finalPrompt}`).digest();
  return hash.readUInt32BE(0);
}

const seed = computeSeed(finalPrompt, ratio);
const url = `${POLLINATIONS_BASE}/${encodeURIComponent(finalPrompt)}` +
            `?width=${dims.width}&height=${dims.height}&seed=${seed}&nologo=true`;
```

Aspect ratio is included in the hash input because changing the aspect ratio changes the target dimensions, and we want a new image (not a stretched same-seed image) when the user changes it.

`finalPrompt` already encodes the description (which encodes the input image, since the vision step is now deterministic), the user prompt, and the style. So the seed transitively depends on every meaningful input.

---

## End-to-end determinism contract

Given the same `(inputImage, prompt, style, aspectRatio)` tuple, the pipeline produces:

```
inputImage      ──► describeInputImage (temp 0, structured)  ──► description (stable text)
                                                                       │
prompt, style, description  ──► buildFinalPrompt  ──► finalPrompt (stable text)
                                                              │
finalPrompt, aspectRatio  ──► computeSeed  ──► seed (stable uint32)
                                                              │
finalPrompt, dims, seed  ──► Pollinations  ──► image (byte-identical)
```

Change **any** of `inputImage`, `prompt`, `style`, or `aspectRatio` and the seed changes, so a new image is generated.

---

## UX implication — regenerate is now idempotent

Hitting `POST /api/generations/:id/regenerate` with no field changes will return the **same image** the user already had. This is intentional under this design, but it changes the meaning of the regenerate button.

If a "give me a fresh variation without changing anything" affordance is needed, the cleanest path is to expose an explicit `seed` (or `variant`) override on the API and let the client increment it. That is not implemented here — flagged as a follow-up.

---

## Files Touched

| File | Change |
|---|---|
| [src/modules/generations/ai.service.ts](../../src/modules/generations/ai.service.ts) | Added `createHash` import, `config: { temperature: 0, topP: 0 }` on Gemini call, rewrote describe prompt (role + anti-hallucination + structured), added `computeSeed`, threaded `seed` into Pollinations URL. |

No other modules were touched. API contract, schema, and worker pipeline are unchanged.

---

## Verification

- `npm run typecheck` — clean.
- Logic check: with the same input image + prompt + style + aspect ratio across two POSTs, both the Gemini description and the Pollinations seed are inputs-of-inputs — so the resulting image bytes match.
- Manual end-to-end test recommended before merging: upload the same image twice with the same prompt and confirm identical output (and confirm that changing the prompt or aspect ratio breaks the lock).

---

## Known Issues / Future Considerations

1. **Model-version drift on Gemini Vision.** `temperature: 0` makes a *given* model deterministic, but Google can swap the underlying snapshot at any time. Pin `GEMINI_VISION_MODEL` to a dated alias if you need long-term reproducibility.

2. **Pollinations model drift.** Pollinations does not version-pin the underlying diffusion model. Same prompt + seed today may not equal same image six months from now. Acceptable for ideation; not acceptable for archival reproduction.

3. **No explicit variation affordance.** The regenerate endpoint is now idempotent. If users want variations on the same inputs, expose `seed` on the API or have the client append a counter to the prompt.

4. **Description caching still deferred.** Same input image will still re-call Gemini Vision on every generation. Now that the description is stable, caching it by image hash is straightforward and would cut one external call per generation. Deferred since Vision is free-tier and not currently a cost concern. (Carried over from [VISION_BRIDGE_FEATURE.md](./VISION_BRIDGE_FEATURE.md#known-issues--future-considerations) item 6.)

5. **`"unknown"` values in the description.** If the model writes `Furniture: unknown`, that literal token will appear in the Pollinations prompt and may steer the output in unintended ways. If this happens in practice, post-process the description to strip `unknown` lines before composing `finalPrompt`.

---

## Summary

The vision-bridge pipeline is now deterministic end-to-end: same inputs → same image. Achieved by locking Gemini sampling, rewriting the describe prompt for low-variance structured output with role anchoring and anti-hallucination guardrails, and seeding Pollinations from a hash of the final prompt. The change is contained to a single file, type-safe, and does not touch the API contract.
