# Generation Endpoints

Base path: `/api/generations`

All endpoints require authentication.

> **Provider note (2026-05-20):** image generation now calls `gemini-2.5-flash-image` directly (paid tier). The async flow, polling, and HTTP contract are unchanged. See [PAID_GEMINI_MIGRATION.md](./PAID_GEMINI_MIGRATION.md) and [SESSION_REVIEW_2026_05_20.md](./SESSION_REVIEW_2026_05_20.md) for the current worker internals.

## ⚠️ Important: Asynchronous Processing

Image generation is **asynchronous** and uses a background job queue:
- `POST /api/generations` returns immediately with status `"pending"`
- Backend processes the job in the background (10-30 seconds)
- Frontend **must poll** `GET /api/generations/:id` to check status
- When status = `"success"`, the image is ready

**See [GENERATION_FLOW.md](./GENERATION_FLOW.md) for complete async flow diagram and implementation guide.**

---

## Create Generation

Create a new image generation.

```
POST /api/generations
```

**Authentication**: ✅ Required

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "prompt": "Modern minimalist living room with natural light",
  "designId": "507f1f77bcf86cd799439020",
  "style": "minimalist",
  "room": "living-room",
  "aspectRatio": "16:9",
  "inputImage": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Request Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | ✅ Yes | Design description (non-empty) |
| `designId` | string | ❌ No | Parent design ID. If omitted, unknown, or not owned by the caller, a new design is created with `firstPrompt = prompt`. |
| `style` | string | ❌ No | Design style: `minimalist`, `modern`, `industrial`, `japandi` |
| `room` | string | ❌ No | Room type: `living-room`, `bedroom`, `kitchen`, `bathroom`, `home-office`, `dining-room`. Appended to the Gemini prompt as `Room: <Human Label>`. |
| `aspectRatio` | string | ❌ No | Image ratio: `1:1`, `16:9`, `9:16`, `4:3`. Passed to Gemini's `imageConfig.aspectRatio` for text-to-image. For image-edit (with `inputImage`), Gemini infers dimensions from the source image and this field is ignored. Defaults to `1:1`. |
| `inputImage` | string | ❌ No | Base64 data URL (`data:image/jpeg;base64,...`, also `image/png` / `image/webp`) of a reference image. Passed to `gemini-2.5-flash-image` as `inlineData` for pixel-faithful image editing. Max payload size: 15 MB. |

**Design resolution**:
- `designId` present and owned by caller → generation is attached to that design.
- `designId` omitted, empty, or pointing to a missing/foreign design → a new `Design` is created (with `firstPrompt = prompt`), and the new id is used.

**Response** (201 Created):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "designId": "507f1f77bcf86cd799439020",
  "originalPrompt": "Modern minimalist living room with natural light",
  "finalPrompt": "Modern minimalist living room with natural light",
  "status": "pending",
  "createdAt": "2024-05-18T10:30:00.000Z",
  "updatedAt": "2024-05-18T10:30:00.000Z"
}
```

**Status Codes**:
- `201` - Generation created and queued
- `400` - Invalid request (empty prompt)
- `401` - Unauthorized (missing/invalid token)
- `500` - Server error

**Process**:
1. API validates prompt (non-empty)
2. Creates Generation record with status: `pending`
3. Queues job in BullMQ
4. Returns immediately with generation ID
5. Job processor runs asynchronously (Gemini direct workflow):
   - Loads `inputImage` from disk if present and sniffs its real mimetype (PNG/JPEG/WebP)
   - Calls `gemini-2.5-flash-image` with `contents: [inlineData?, text(finalPrompt)]`
   - For text-to-image: also sets `imageConfig.aspectRatio` and a deterministic `seed`
   - For image-edit: omits `seed` and `imageConfig` (Gemini rejects them with `inlineData` present)
   - Extracts image bytes from `candidates[0].content.parts[].inlineData.data`
   - Saves image to filesystem with the correct extension based on Gemini's reported mimetype (usually `.png`)
   - Persists the composed `finalPrompt` on the generation record
6. Frontend polls to check status

> Image-edit mode is pixel-faithful — Gemini sees the actual reference image bytes via `inlineData`, not a text description. Trade-off: image-edit calls are not byte-deterministic across runs (Gemini doesn't accept a seed when an `inlineData` part is present).

**Example**:
```bash
curl -X POST http://localhost:3001/api/generations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Cozy scandinavian bedroom",
    "style": "minimalist",
    "aspectRatio": "16:9"
  }'
```

**JavaScript**:
```typescript
const token = localStorage.getItem('auth_token');
const response = await fetch('http://localhost:3001/api/generations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Cozy scandinavian bedroom',
    style: 'minimalist',
    aspectRatio: '16:9'
  })
});

const generation = await response.json();
console.log(generation.id); // Use this ID to poll for results
```

---

## List Generations

Get all generations for the current user.

```
GET /api/generations
```

**Authentication**: ✅ Required

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | - | Max results (not implemented) |
| `offset` | number | - | Skip first N results (not implemented) |

**Response** (200 OK):
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "designId": "507f1f77bcf86cd799439020",
    "originalPrompt": "Modern living room",
    "finalPrompt": "Modern living room with natural light and contemporary furniture",
    "imageUrl": "http://localhost:3000/api/images/550e8400-e29b-41d4-a716-446655440000.jpg",
    "status": "success",
    "style": "minimalist",
    "aspectRatio": "16:9",
    "createdAt": "2024-05-18T10:30:00.000Z",
    "updatedAt": "2024-05-18T10:32:15.000Z"
  },
  {
    "id": "507f1f77bcf86cd799439013",
    "userId": "507f1f77bcf86cd799439012",
    "designId": "507f1f77bcf86cd799439021",
    "originalPrompt": "Industrial kitchen",
    "finalPrompt": "Industrial kitchen",
    "imageUrl": null,
    "status": "processing",
    "style": "industrial",
    "aspectRatio": "4:3",
    "createdAt": "2024-05-18T11:00:00.000Z",
    "updatedAt": "2024-05-18T11:00:05.000Z"
  }
]
```

**Status Codes**:
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique generation ID |
| `userId` | string | Owner user ID |
| `designId` | string | Parent design ID |
| `originalPrompt` | string | User's original prompt |
| `finalPrompt` | string | AI-enhanced prompt |
| `imageUrl` | string | URL to generated image (null if not ready) |
| `status` | string | `pending`, `processing`, `success`, or `failed` |
| `errorMessage` | string | Error details if failed (omitted if success) |
| `style` | string | Design style used |
| `room` | string | Room type (if specified on the request) |
| `aspectRatio` | string | Image aspect ratio |
| `createdAt` | string | ISO 8601 timestamp |
| `updatedAt` | string | ISO 8601 timestamp |

**Sorting**: Results sorted by `createdAt` descending (newest first)

**Example**:
```bash
curl -X GET http://localhost:3001/api/generations \
  -H "Authorization: Bearer <token>"
```

**JavaScript**:
```typescript
const token = localStorage.getItem('auth_token');
const response = await fetch('http://localhost:3001/api/generations', {
  headers: { Authorization: `Bearer ${token}` }
});

const generations = await response.json();
generations.forEach(gen => {
  console.log(`${gen.originalPrompt} - Status: ${gen.status}`);
});
```

---

## Get Generation

Get a specific generation by ID.

```
GET /api/generations/:id
```

**Authentication**: ✅ Required

**Parameters**:
- `id` (string, required) - Generation ID (from create response)

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "designId": "507f1f77bcf86cd799439020",
  "originalPrompt": "Modern minimalist living room with natural light",
  "finalPrompt": "Modern minimalist living room with natural light and minimalist furniture aesthetic",
  "imageUrl": "http://localhost:3000/api/images/550e8400-e29b-41d4-a716-446655440000.jpg",
  "status": "success",
  "style": "minimalist",
  "aspectRatio": "16:9",
  "createdAt": "2024-05-18T10:30:00.000Z",
  "updatedAt": "2024-05-18T10:32:15.000Z"
}
```

**Status Codes**:
- `200` - Success
- `401` - Unauthorized (invalid token)
- `404` - Generation not found (or doesn't belong to user)
- `500` - Server error

**Use Case**: Poll this endpoint to check generation status.

**Example**:
```bash
curl -X GET http://localhost:3001/api/generations/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```

**JavaScript - Polling Pattern**:
```typescript
const token = localStorage.getItem('auth_token');
const generationId = '507f1f77bcf86cd799439011';

// Poll every 2 seconds until complete
const poll = async () => {
  const response = await fetch(
    `http://localhost:3001/api/generations/${generationId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const generation = await response.json();

  console.log(`Status: ${generation.status}`);

  if (generation.status === 'success') {
    console.log(`Image ready: ${generation.imageUrl}`);
    return generation;
  } else if (generation.status === 'failed') {
    console.error(`Error: ${generation.errorMessage}`);
    return generation;
  } else {
    // Still processing, poll again
    setTimeout(poll, 2000);
  }
};

poll();
```

---

## Regenerate Design (Removed)

`POST /api/generations/:id/regenerate` was removed in 2026-05-20. The client-side "Regenerate" UX is now a pure prefill flow: the frontend navigates to `/generate?prompt=…&image=…&style=…&room=…` and calls `POST /api/generations` like any other new generation. See [docs/ui/REGENERATE_API_CLEANUP.md](../ui/REGENERATE_API_CLEANUP.md) for the frontend side of the change.

---

## Delete Generation

Delete a generation and its image.

```
DELETE /api/generations/:id
```

**Authentication**: ✅ Required

**Parameters**:
- `id` (string, required) - Generation ID to delete

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true
}
```

**Status Codes**:
- `200` - Deleted successfully
- `401` - Unauthorized
- `404` - Generation not found (or doesn't belong to user)
- `500` - Server error

**What Happens**:
1. Verifies generation belongs to user
2. Deletes image file from filesystem
3. Deletes generation record from database
4. Returns success

**Example**:
```bash
curl -X DELETE http://localhost:3001/api/generations/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```

**JavaScript**:
```typescript
const token = localStorage.getItem('auth_token');
const generationId = '507f1f77bcf86cd799439011';

const response = await fetch(
  `http://localhost:3001/api/generations/${generationId}`,
  {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  }
);

if (response.ok) {
  console.log('Generation deleted');
}
```

---

## Generation Status

A generation goes through these states:

| Status | Description | Duration |
|--------|-------------|----------|
| `pending` | Queued, waiting for processing | < 1 second |
| `processing` | Job started, image generating | 10-30 seconds |
| `success` | Image generated, available at imageUrl | - |
| `failed` | Error occurred, see errorMessage | - |

**State Diagram**:
```
pending → processing → success
   ↓           ↓
   └─ → failed
```

---

## Generation Styles

| Style | Description |
|-------|-------------|
| `minimalist` | Clean, simple, uncluttered spaces |
| `modern` | Contemporary design with sleek lines |
| `industrial` | Raw materials, exposed elements |
| `japandi` | Japanese-scandinavian hybrid |

---

## Room Types

| Room | Sent to Gemini as |
|------|-------------------|
| `living-room` | `Room: Living Room` |
| `bedroom` | `Room: Bedroom` |
| `kitchen` | `Room: Kitchen` |
| `bathroom` | `Room: Bathroom` |
| `home-office` | `Room: Home Office` |
| `dining-room` | `Room: Dining Room` |

Persisted on the generation record and returned in responses. Wire format is kebab-case to match the existing slug convention; the human-readable label is what reaches the model.

---

## Aspect Ratios

| Ratio | Use Case |
|-------|----------|
| `1:1` | Square (social media, profiles) |
| `16:9` | Widescreen (desktop, presentations) |
| `9:16` | Vertical (mobile, stories) |
| `4:3` | Standard (prints, classic) |

---

## Error Responses

See [errors.md](./errors.md) for complete error documentation.

### Common Generation Errors

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| `Prompt is required` | 400 | Empty or missing prompt | Provide non-empty prompt string |
| `Generation not found` | 404 | ID doesn't exist or wrong user | Check generation ID |
| `Failed to create generation` | 500 | Server error | Retry or contact support |
| `Failed to fetch generation` | 500 | Database error | Retry or contact support |

---

## Rate Limiting

**Recommended limits** (not implemented yet):
- 5 generations per minute per user
- Queue max: 100 concurrent jobs

---

## Performance Tips

1. **Poll Interval**: Use 2-3 second intervals (not faster)
2. **Timeouts**: Assume 30-second max generation time
3. **Batch**: Get all generations at once, cache locally
4. **Cleanup**: Delete old generations to save storage

---

## Webhook Updates (Future)

Planned webhook events:
- `generation.created`
- `generation.processing`
- `generation.completed`
- `generation.failed`
