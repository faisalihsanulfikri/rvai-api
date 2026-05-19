# RoomVision AI - API Documentation

Complete REST API documentation for RoomVision AI backend.

---

## 🚀 Getting Started

### For Quick Setup
👉 **[QUICK_START.md](./QUICK_START.md)** — Get backend running in 5 minutes + test all endpoints

### For Complete Understanding
1. **[API Overview](./overview.md)** — Base URLs, authentication, and key concepts
2. **[Examples](./examples.md)** — Complete code examples and workflows
3. **Choose a topic** from the documentation files below

---

## 📚 Documentation Index

### 🎯 Getting Started
- **[QUICK_START.md](./QUICK_START.md)** ⭐ — Setup in 5 minutes, test all endpoints
- **[overview.md](./overview.md)** — API intro, authentication, status codes, workflows

### 📖 Core Documentation
- **[examples.md](./examples.md)** — Code examples: Curl, JavaScript, React with full workflows
- **[models.md](./models.md)** — Data structures, fields, MongoDB schema
- **[errors.md](./errors.md)** — Error codes, debugging, solutions

### 🔐 Authentication
- **[auth.md](./auth.md)** — POST /verify-google, GET /me, POST /logout
- **[AUTHENTICATION_UPDATE.md](./AUTHENTICATION_UPDATE.md)** — Why we changed OAuth, migration guide

### 🎨 Image Generation
- **[generations.md](./generations.md)** — POST/GET /generations, async flow
- **[images.md](./images.md)** — Serving generated images, storage details
- **[GENERATION_FLOW.md](./GENERATION_FLOW.md)** — Complete async flow, polling strategy, React example
- **[VISION_BRIDGE_FEATURE.md](./VISION_BRIDGE_FEATURE.md)** — `inputImage` + aspect-ratio vision-bridge flow
- **[MULTIPART_UPLOAD_SUPPORT.md](./MULTIPART_UPLOAD_SUPPORT.md)** — multipart/form-data on create + regenerate

### 📋 Development & Review
- **[SESSION_REVIEW_2026_05_18.md](./SESSION_REVIEW_2026_05_18.md)** — Complete session: changes, validation, architecture review

---

## Quick Reference

### Authentication
```bash
# Verify Google token → get app token
POST /api/auth/verify-google
Content-Type: application/json
{ "token": "google_id_token" }

# Get current user
GET /api/auth/me
Authorization: Bearer <token>

# Logout
POST /api/auth/logout
Authorization: Bearer <token>
```

### Generations
```bash
# Create generation
POST /api/generations
Authorization: Bearer <token>
Content-Type: application/json
{"prompt": "...", "style": "minimalist"}

# List user's generations
GET /api/generations
Authorization: Bearer <token>

# Get specific generation
GET /api/generations/:id
Authorization: Bearer <token>

# Regenerate with new prompt
POST /api/generations/:id/regenerate
Authorization: Bearer <token>
{"prompt": "..."}

# Delete generation
DELETE /api/generations/:id
Authorization: Bearer <token>
```

### Images
```bash
# Serve image
GET /api/images/:filename
```

---

## Common Workflows

### 1. User Registration & Login
```
User → GET /api/auth/google
     → (Google OAuth)
     → GET /api/auth/google/callback
     → Redirected with token
     → Frontend stores token
```

[Full guide](./auth.md)

### 2. Generate Image
```
User → POST /api/generations (prompt)
    → Job queued (status: pending)
    → Worker processes (status: processing)
    → Image generated (status: success)
    → GET /api/generations/:id
    → Display image
```

[Full guide](./generations.md)

### 3. View Gallery
```
User → GET /api/generations
    → List all designs
    → Click design
    → GET /api/generations/:id
    → View details, regenerate
```

[Full guide](./generations.md#list-generations)

---

## Key Concepts

### Status Codes
- `200` — Success
- `201` — Created
- `400` — Bad request (validation error)
- `401` — Unauthorized (invalid/missing token)
- `404` — Not found
- `500` — Server error

### Generation Status
- `pending` — Queued, not started
- `processing` — Image being generated
- `success` — Image ready, available at imageUrl
- `failed` — Error occurred, see errorMessage

### Design Styles
- `minimalist` — Clean, simple
- `modern` — Contemporary
- `industrial` — Raw materials
- `japandi` — Japanese-scandinavian

---

## Code Examples

### TypeScript/JavaScript

**Create generation**:
```typescript
const response = await fetch('http://localhost:3001/api/generations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Modern minimalist living room'
  })
});
const generation = await response.json();
```

[More examples](./examples.md)

### React Component

```typescript
import { useState, useEffect } from 'react';

export function GenerationDetail({ id }) {
  const [generation, setGeneration] = useState(null);

  useEffect(() => {
    const poll = async () => {
      const res = await fetch(`/api/generations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setGeneration(data);

      if (data.status === 'success' || data.status === 'failed') {
        return;
      }
      setTimeout(poll, 2000);
    };
    poll();
  }, [id]);

  return generation?.status === 'success' ? (
    <img src={generation.imageUrl} />
  ) : (
    <p>Loading...</p>
  );
}
```

[More React examples](./examples.md#react-component-examples)

---

## Data Models

### User
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://...",
  "createdAt": "2024-05-18T10:30:00Z",
  "updatedAt": "2024-05-18T10:30:00Z"
}
```

### Generation
```json
{
  "id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "originalPrompt": "Modern kitchen",
  "finalPrompt": "Modern kitchen with island...",
  "imageUrl": "http://localhost:3000/api/images/550e8400-e29b-41d4-a716-446655440000.jpg",
  "status": "success",
  "style": "modern",
  "aspectRatio": "16:9",
  "createdAt": "2024-05-18T10:30:00Z",
  "updatedAt": "2024-05-18T10:32:15Z"
}
```

[Full schemas](./models.md)

---

## Error Handling

### Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 401 | No token provided | Add Authorization header |
| 401 | Invalid token | Get new token from OAuth |
| 400 | Prompt is required | Provide non-empty prompt |
| 404 | Generation not found | Check ID or create new |
| 500 | Failed to create generation | Retry or check server |

[Complete error reference](./errors.md)

---

## Authentication

All endpoints except OAuth require a **Bearer token** in the Authorization header:

```
Authorization: Bearer <token>
```

**Token format**: Base64-encoded JSON with userId, email, name

**Get token**:
1. Redirect to `GET /api/auth/google`
2. User authorizes at Google
3. Redirect back with `?token=...`
4. Store in localStorage

[Authentication guide](./auth.md)

---

## Rate Limits

**Current**: None

**Recommended for production**:
- 5 requests/minute per user (authentication)
- 5 generations/minute per user
- 100 requests/minute per IP (images)

---

## Deploymen Environment Variables

```
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend.com

MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

GEMINI_API_KEY=your-api-key
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://your-api.com/api/auth/google/callback

IMAGE_STORAGE_PATH=/var/data/images
SESSION_SECRET=your-secret-key
```

---

## Support

### Finding Answers

1. **"How do I..."** → [Examples](./examples.md)
2. **"What does this endpoint..."** → [Endpoint guides](./auth.md), [generations.md](./generations.md), [images.md](./images.md)
3. **"What's the data structure..."** → [Models](./models.md)
4. **"I got an error..."** → [Error reference](./errors.md)
5. **"What's an API..."** → [Overview](./overview.md)

### Debugging

```bash
# Check server is running
curl http://localhost:3001/health

# Check your token
TOKEN="your-token"
echo $TOKEN | base64 -d

# List your generations
curl http://localhost:3001/api/generations \
  -H "Authorization: Bearer $TOKEN" | jq
```

[More debugging tips](./errors.md#debugging)

---

## Roadmap

- [ ] JWT tokens with expiration
- [ ] Refresh tokens
- [ ] Rate limiting
- [ ] Webhooks
- [ ] Batch operations
- [ ] Advanced filtering/search
- [ ] Image variations (upscale, style transfer)
- [ ] Design collections
- [ ] Social features (sharing, comments)

---

## Related Documentation

- **Backend Setup**: [BACKEND_README.md](../../BACKEND_README.md)
- **Architecture**: [ARCHITECTURE.md](../../ARCHITECTURE.md)
- **Modular Monolith Pattern**: [MODULAR_MONOLITH.md](../../MODULAR_MONOLITH.md)
- **Frontend Integration**: [FRONTEND_INTEGRATION.md](../../FRONTEND_INTEGRATION.md)

---

## Questions?

- Check the specific endpoint documentation
- Review error codes in [errors.md](./errors.md)
- Look at code examples in [examples.md](./examples.md)
- Refer to data models in [models.md](./models.md)

---

**Last Updated**: 2024-05-18
**API Version**: v1.0.0
**Status**: Production-ready
