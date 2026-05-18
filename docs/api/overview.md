# RoomVision AI - API Documentation

## Overview

RoomVision AI is a REST API for generating interior and architecture design images using AI. Users can create prompts, generate images, save to a personal gallery, and regenerate designs with modified prompts.

**Base URL**: `http://localhost:3001` (development) or your production URL

**Current Version**: v1.0.0

## Architecture

```
Next.js Frontend
        ↓ HTTP/REST
Express API Server
        ↓
┌──────────────────────────────────┐
│ MongoDB │ Redis │ File Storage   │
└──────────────────────────────────┘
        ↓
Gemini API + Pollinations.ai
```

## Key Features

- 🔐 **Google OAuth 2.0** authentication
- 📸 **Image Generation** via Pollinations.ai
- 🤖 **Prompt Enhancement** via Gemini API
- 📦 **Async Job Queue** with BullMQ
- 💾 **Persistent Gallery** with MongoDB
- 🎨 **Multiple Styles** (minimalist, modern, industrial, japandi)

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header.

```
Authorization: Bearer <token>
```

**Get Token**:
1. Visit `GET /api/auth/google` to initiate OAuth
2. User authorizes at Google
3. Redirected to frontend with token in URL: `?token=<token>`
4. Frontend stores token in localStorage
5. Include in all subsequent requests

**Token Format**: Base64-encoded JSON
```json
{
  "userId": "user_id_here",
  "email": "user@example.com",
  "name": "User Name",
  "iat": 1234567890
}
```

## Response Format

All responses are JSON with consistent structure.

### Success Response

```json
{
  "id": "uuid",
  "status": "success",
  "data": { }
}
```

### Error Response

```json
{
  "error": "Error message describing what went wrong"
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| `200` | Request succeeded |
| `201` | Resource created |
| `400` | Bad request (invalid input) |
| `401` | Unauthorized (missing/invalid token) |
| `404` | Resource not found |
| `500` | Server error |

## Rate Limiting

No rate limiting currently implemented. Production deployment should add:
- Per-user rate limits
- Request throttling
- Quota management

## Pagination

List endpoints support pagination via query parameters:

```
GET /api/generations?limit=10&offset=0
```

**Note**: Currently returns all results. Implement pagination for large datasets.

## CORS

CORS is enabled for the frontend origin specified in `FRONTEND_URL` environment variable.

**Default**: `http://localhost:3000`

## Endpoints Summary

| Module | Endpoint | Method | Auth | Purpose |
|--------|----------|--------|------|---------|
| **Auth** | `/api/auth/google` | GET | ❌ | Initiate Google OAuth |
| | `/api/auth/google/callback` | GET | ❌ | OAuth callback (internal) |
| | `/api/auth/me` | GET | ✅ | Get current user |
| | `/api/auth/logout` | POST | ✅ | Logout user |
| **Generations** | `/api/generations` | POST | ✅ | Create generation |
| | `/api/generations` | GET | ✅ | List user's generations |
| | `/api/generations/:id` | GET | ✅ | Get specific generation |
| | `/api/generations/:id/regenerate` | POST | ✅ | Regenerate with new prompt |
| | `/api/generations/:id` | DELETE | ✅ | Delete generation |
| **Images** | `/api/images/:filename` | GET | ❌ | Serve image file |

## Workflow

### 1. User Registration/Login

```
User clicks "Sign in with Google"
    ↓
GET /api/auth/google
    ↓
Passport redirects to Google OAuth
    ↓
User authorizes app at Google
    ↓
Google redirects to /api/auth/google/callback
    ↓
App creates/updates user in MongoDB
    ↓
App generates token
    ↓
Redirects to frontend with ?token=...
    ↓
Frontend extracts token → stores in localStorage
```

### 2. Generate Image

```
User enters prompt on frontend
    ↓
POST /api/generations (with token)
    ↓
API creates Generation record (status: pending)
    ↓
Job queued in BullMQ
    ↓
Queue processor picks up job
    ↓
Enhance prompt with Gemini
    ↓
Generate image with Pollinations.ai
    ↓
Save image to filesystem
    ↓
Update database with image URL
    ↓
Frontend polls GET /api/generations/:id
    ↓
Returns with status: success, imageUrl
    ↓
Frontend displays image in gallery
```

### 3. View Gallery

```
User navigates to /gallery
    ↓
Frontend calls GET /api/generations (with token)
    ↓
API returns all user's generations sorted by date
    ↓
Frontend displays in grid layout
```

### 4. Regenerate Design

```
User clicks regenerate on saved design
    ↓
Modifies prompt
    ↓
POST /api/generations/:id/regenerate (with token)
    ↓
API updates generation with new prompt (status: pending)
    ↓
Job queued (same as step 2)
    ↓
Frontend polls for completion
    ↓
Image updates in gallery
```

## Data Models

See [models.md](./models.md) for complete data structure documentation.

### User

```json
{
  "id": "ObjectId",
  "googleId": "string",
  "email": "string",
  "name": "string",
  "picture": "string (optional)",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}
```

### Generation

```json
{
  "id": "ObjectId",
  "userId": "ObjectId",
  "originalPrompt": "string",
  "finalPrompt": "string",
  "imageUrl": "string (nullable)",
  "imageFilename": "string (nullable)",
  "status": "pending | processing | success | failed",
  "errorMessage": "string (optional)",
  "style": "minimalist | modern | industrial | japandi (optional)",
  "aspectRatio": "1:1 | 16:9 | 9:16 | 4:3 (optional)",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}
```

## Error Handling

See [errors.md](./errors.md) for complete error reference.

Common errors:

| Error | Status | Solution |
|-------|--------|----------|
| `No token provided` | 401 | Add Authorization header |
| `Invalid token` | 401 | Get new token from OAuth |
| `Prompt is required` | 400 | Provide non-empty prompt |
| `Generation not found` | 404 | Check generation ID exists |
| `Unauthorized` | 401 | Token user doesn't own generation |

## Client Libraries

### JavaScript/TypeScript

```typescript
// See FRONTEND_INTEGRATION.md for full examples
const api = {
  generations: {
    create: (data) => fetch('/api/generations', { method: 'POST', body: JSON.stringify(data) }),
    list: () => fetch('/api/generations'),
    get: (id) => fetch(`/api/generations/${id}`),
    regenerate: (id, data) => fetch(`/api/generations/${id}/regenerate`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => fetch(`/api/generations/${id}`, { method: 'DELETE' }),
  },
};
```

## Environment Variables

Required for API to function:

```
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/roomvision-ai
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
IMAGE_STORAGE_PATH=./uploads/images
SESSION_SECRET=your-secret-key
```

## Rate Limits (Future)

Currently no rate limiting. Recommended for production:

- Authentication: 5 requests per minute per IP
- Generation: 5 requests per minute per user
- Image serving: 100 requests per minute per IP

## Webhooks (Future)

Planned webhooks for async events:

- `generation.created` - New generation queued
- `generation.processing` - Image generation started
- `generation.completed` - Image generation succeeded
- `generation.failed` - Image generation failed

## Versioning

Current API version: **v1.0.0**

No breaking changes planned. Future versions will maintain backward compatibility or provide migration path.

## Support

For issues or questions:

1. Check [errors.md](./errors.md) for error codes
2. See [examples.md](./examples.md) for code examples
3. Review [auth.md](./auth.md), [generations.md](./generations.md), [images.md](./images.md) for specific endpoints

## Next Steps

1. **Authentication**: See [auth.md](./auth.md)
2. **Generate Images**: See [generations.md](./generations.md)
3. **Serve Images**: See [images.md](./images.md)
4. **Full Examples**: See [examples.md](./examples.md)
