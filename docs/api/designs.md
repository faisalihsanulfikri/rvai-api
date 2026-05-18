# Design Endpoints

Base path: `/api/designs`

All endpoints require authentication.

A `Design` groups one or more `Generation` records (see [models.md](./models.md)). Designs are created automatically by `POST /api/generations` when no valid `designId` is supplied.

---

## List Designs

Get all designs owned by the authenticated user, ordered by `_id` descending (newest first).

```
GET /api/designs
```

**Authentication**: ✅ Required

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
[
  {
    "id": "507f1f77bcf86cd799439021",
    "userId": "507f1f77bcf86cd799439012",
    "firstPrompt": "Industrial kitchen with exposed brick",
    "createdAt": "2026-05-19T11:00:00.000Z",
    "updatedAt": "2026-05-19T11:00:00.000Z"
  },
  {
    "id": "507f1f77bcf86cd799439020",
    "userId": "507f1f77bcf86cd799439012",
    "firstPrompt": "Modern minimalist living room",
    "createdAt": "2026-05-19T10:30:00.000Z",
    "updatedAt": "2026-05-19T10:30:00.000Z"
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
| `id` | string | Design ID |
| `userId` | string | Owner user ID |
| `firstPrompt` | string | The prompt that originally created this design |
| `createdAt` | string | ISO 8601 timestamp |
| `updatedAt` | string | ISO 8601 timestamp |

**Sorting**: Results sorted by `_id` descending. Since MongoDB ObjectIds encode a timestamp prefix, this is equivalent to "newest first" for normally-created documents.

**Example**:
```bash
curl -X GET http://localhost:3001/api/designs \
  -H "Authorization: Bearer <token>"
```

**JavaScript**:
```typescript
const token = localStorage.getItem('auth_token');
const response = await fetch('http://localhost:3001/api/designs', {
  headers: { Authorization: `Bearer ${token}` }
});

const designs = await response.json();
designs.forEach(d => console.log(d.id, d.firstPrompt));
```
