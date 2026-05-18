# Designs Feature

**Date**: May 19, 2026
**Status**: ✅ Implemented
**Build Status**: ✅ `tsc --noEmit` clean

---

## 🎯 Goal

Introduce a `Design` collection that groups one or more `Generation` records, so that successive generations sharing the same creative intent can be linked together.

**Before**:
```
User → Generation (1:N)
```

**After**:
```
User → Design (1:N) → Generation (1:N)
```

---

## 📦 Database Changes

### New collection: `designs`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | Auto |
| `userId` | String | Indexed; owner of the design |
| `firstPrompt` | String | The prompt that originally created the design |
| `createdAt` | Date | Auto (timestamps) |
| `updatedAt` | Date | Auto (timestamps) |

**Indexes**:
- `userId`
- `(userId, createdAt)` compound

### Updated collection: `generations`

Added field:

| Field | Type | Notes |
|-------|------|-------|
| `designId` | String | **Required**, indexed; FK to `designs._id` |

---

## 🔌 API Changes

### `POST /api/generations` — extended

Request body adds optional `designId`:

```json
{
  "prompt": "Modern minimalist living room",
  "designId": "507f1f77bcf86cd799439020",
  "style": "minimalist",
  "aspectRatio": "16:9"
}
```

**Resolution logic** (in [generation.service.ts](../../src/modules/generations/generation.service.ts)):

| Input | Behavior |
|-------|----------|
| `designId` omitted / empty | Create new `Design` with `firstPrompt = prompt`; use its id |
| `designId` is not a valid ObjectId | Same as omitted |
| `designId` exists and belongs to caller | Reuse it |
| `designId` exists but belongs to another user | Treated as missing; create new design |

Response now includes `designId`.

### `POST /api/generations/:id/regenerate` — unchanged contract, includes `designId`

Regenerate **never changes** the parent design — the generation stays attached to its original `designId`.

### `GET /api/generations`, `GET /api/generations/:id` — include `designId`

All response payloads now carry `designId`.

### `GET /api/designs` — **new**

Returns the authenticated user's designs, sorted by `_id` desc (newest first).

```bash
curl http://localhost:3001/api/designs -H "Authorization: Bearer <token>"
```

Response:
```json
[
  {
    "id": "507f1f77bcf86cd799439021",
    "userId": "507f1f77bcf86cd799439012",
    "firstPrompt": "Industrial kitchen",
    "createdAt": "2026-05-19T11:00:00.000Z",
    "updatedAt": "2026-05-19T11:00:00.000Z"
  }
]
```

See [designs.md](./designs.md) for full doc.

---

## 🛡️ Ownership & Security

`designId` from the client is **never trusted blindly**:

- `findDesignForUser(designId, userId)` (in [design.service.ts](../../src/modules/designs/design.service.ts)) validates the ObjectId, then queries with both `_id` AND `userId`.
- If a foreign user's `designId` is supplied, the lookup returns null, and the create path falls through to "create a new design" — so a generation cannot be attached to another user's design.

`GET /api/designs` is also user-scoped via the JWT.

---

## 📁 Files Touched

### New
- [src/modules/designs/design.model.ts](../../src/modules/designs/design.model.ts) — Mongoose schema
- [src/modules/designs/design.service.ts](../../src/modules/designs/design.service.ts) — `createDesign`, `findDesignForUser`, `listDesignsByUser`
- [src/modules/designs/design.controller.ts](../../src/modules/designs/design.controller.ts) — list handler
- [src/modules/designs/design.route.ts](../../src/modules/designs/design.route.ts) — `GET /` with `authMiddleware`
- [src/modules/designs/index.ts](../../src/modules/designs/index.ts) — module exports
- [docs/api/designs.md](./designs.md) — endpoint reference
- [docs/api/DESIGNS_FEATURE.md](./DESIGNS_FEATURE.md) — this file

### Updated
- [src/shared/types/index.ts](../../src/shared/types/index.ts) — added `Design`; added `designId` to `Generation` and `GenerationJob`
- [src/modules/generations/generation.model.ts](../../src/modules/generations/generation.model.ts) — added `designId` field (required, indexed)
- [src/modules/generations/generation.types.ts](../../src/modules/generations/generation.types.ts) — `CreateGenerationRequest.designId?: string`
- [src/modules/generations/generation.service.ts](../../src/modules/generations/generation.service.ts) — design resolution in `createGeneration`
- [src/modules/generations/generation.controller.ts](../../src/modules/generations/generation.controller.ts) — pass `designId` to BullMQ job; include in responses
- [src/modules/index.ts](../../src/modules/index.ts) — export `designs` module
- [src/app.ts](../../src/app.ts) — mount `/api/designs` route
- [docs/api/models.md](./models.md) — new `Design` section, updated `Generation`, updated relationships
- [docs/api/generations.md](./generations.md) — documented `designId` request/response, regenerate note
- [docs/api/INDEX.md](./INDEX.md) — link to new docs

---

## ⚠️ Migration Note

`designId` is **`required: true`** on the `Generation` schema. Existing documents written before this change do not have the field.

- **Reads** still work (Mongoose only validates on write).
- **Writes** to legacy documents (e.g. updating status from the worker) are unaffected because the worker uses `findByIdAndUpdate`, which does not re-run full-document validation.
- **New** generations always have a `designId`.

If you want a clean dataset, run a one-shot backfill:

```javascript
// For each generation without a designId, create a Design from its originalPrompt
const orphans = await db.generations.find({ designId: { $exists: false } }).toArray();
for (const g of orphans) {
  const d = await db.designs.insertOne({
    userId: g.userId,
    firstPrompt: g.originalPrompt,
    createdAt: g.createdAt,
    updatedAt: g.createdAt,
  });
  await db.generations.updateOne(
    { _id: g._id },
    { $set: { designId: d.insertedId.toString() } }
  );
}
```

Skipping the backfill is also fine for dev — those records will just have no parent design.

---

## ✅ Verification

- `npx tsc --noEmit` → clean
- New design auto-created when `POST /api/generations` is called without `designId`
- Existing design reused when valid owned `designId` is supplied
- Foreign `designId` is silently replaced with a new design (no information leak)
- `GET /api/designs` returns user's designs in newest-first order
- Regenerate keeps the original `designId`

---

## 🔮 Possible Follow-ups (Not Done)

- `GET /api/designs/:id` returning the design plus its generations
- `DELETE /api/designs/:id` with cascade to generations + images
- Rename a design / edit `firstPrompt`
- Pagination on `GET /api/designs` and `GET /api/generations`
- A compound index on `(designId, createdAt)` if we start listing generations within a design
