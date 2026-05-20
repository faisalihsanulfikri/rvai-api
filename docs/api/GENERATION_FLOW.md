# Image Generation Flow

> **Provider note (2026-05-20):** generation now calls `gemini-2.5-flash-image` directly (paid tier) instead of the Gemini-Vision + Pollinations bridge described below. The async flow, polling, and API contract are unchanged. See [PAID_GEMINI_MIGRATION.md](./PAID_GEMINI_MIGRATION.md) for the current worker internals.

## Overview

Image generation is **asynchronous** and uses a job queue system:

1. Frontend sends POST request
2. Backend immediately returns with `status: "pending"`
3. Job is queued in Redis
4. Worker processes the job (enhance prompt + generate image)
5. Frontend polls for status updates
6. When `status: "success"`, image is ready

## Step-by-Step Flow

### Phase 1: Create Generation Request

**Frontend sends:**
```bash
POST /api/generations
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "Modern minimalist living room with natural light",
  "style": "minimalist",
  "aspectRatio": "16:9",
  "inputImage": "data:image/jpeg;base64,..."   // optional reference image
}
```

**Backend immediately returns (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "originalPrompt": "Modern minimalist living room with natural light",
  "finalPrompt": "Modern minimalist living room with natural light",
  "status": "pending",
  "createdAt": "2024-05-18T10:30:00Z",
  "updatedAt": "2024-05-18T10:30:00Z"
}
```

**What happened in backend:**
1. ✓ If `inputImage` was supplied, decoded the data URL and saved it to disk as `inputImageFilename`
2. ✓ Created generation record in MongoDB with status: "pending" (including `inputImageFilename` if any)
3. ✓ Queued job in Redis (the job carries the filename, not the base64 — keeps Redis lean)
4. ✓ Returned immediately (non-blocking)

### Phase 2: Job Processing (Background)

**Worker picks up the job (vision-bridge workflow, all free):**
```
Queue Job #1: generation-507f1f77bcf86cd799439011
  ├─ Status → "processing"
  ├─ Load inputImage from disk → base64 (if inputImageFilename present)
  ├─ Gemini Vision (gemini-2.5-flash):  inputImage → text description
  │   (skipped if no inputImage)
  ├─ Build finalPrompt:
  │     "Reference scene: <description>\n\nTransform to: <prompt>\n\nStyle: <style>"
  ├─ Pollinations:  GET /prompt/<encoded>?width=W&height=H&nologo=true
  ├─ Save image to disk
  ├─ Update database with imageUrl + finalPrompt
  └─ Status → "success"
```

**Time taken:** 6-20 seconds depending on:
- Gemini Vision latency (~1-3s, only when inputImage present)
- Pollinations image generation (~5-15s)
- Network conditions

**Quality note:** Pollinations is text-to-image only. The reference image is bridged via a text description, so high-level structure (layout, palette, materials) transfers but fine details (exact textures, specific furniture placement) won't.

### Phase 3: Frontend Polls for Status

**Frontend must poll GET endpoint:**
```bash
GET /api/generations/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Responses while processing:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "status": "processing",
  "originalPrompt": "...",
  "finalPrompt": "Enhanced: ... very detailed description ...",
  "imageUrl": null
}
```

**Response when complete:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "status": "success",
  "originalPrompt": "Modern minimalist living room with natural light",
  "finalPrompt": "Enhanced: A serene modern minimalist ...",
  "imageUrl": "http://localhost:3001/api/images/550e8400-e29b-41d4-a716-446655440000.jpg",
  "imageFilename": "550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

**Response if error:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "status": "failed",
  "errorMessage": "Failed to generate image: API error",
  "imageUrl": null
}
```

## Frontend Implementation

### React Example with Polling

```typescript
import { useState, useEffect } from 'react';

function GenerateDesign() {
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const token = localStorage.getItem('auth_token');

  // Step 1: Create generation
  const handleGenerate = async (prompt: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          style: 'minimalist',
          aspectRatio: '16:9'
        })
      });

      if (!response.ok) throw new Error('Failed to create generation');

      const data = await response.json();
      setGenerationId(data.id);
      setStatus('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  // Step 2: Poll for status
  useEffect(() => {
    if (!generationId || status === 'success' || status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `http://localhost:3001/api/generations/${generationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) throw new Error('Failed to fetch status');

        const data = await response.json();
        setStatus(data.status);

        if (data.status === 'success') {
          setImageUrl(data.imageUrl);
        } else if (data.status === 'failed') {
          setError(data.errorMessage);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [generationId, status, token]);

  return (
    <div>
      <button onClick={() => handleGenerate('Modern living room')}>
        Generate Design
      </button>

      {status === 'pending' && <p>Queuing...</p>}
      {status === 'processing' && <p>Generating image...</p>}
      {status === 'success' && <img src={imageUrl} alt="Generated design" />}
      {status === 'failed' && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
```

## Common Issues & Solutions

### Issue: "Nothing happens" after POST

**Possible causes:**
1. **Token missing or invalid** → Check Authorization header
2. **Redis not running** → Job can't be queued
3. **MongoDB not running** → Generation can't be created
4. **Frontend not polling** → It's working, but you're not checking for updates!

**Solution:**
```typescript
// ✅ Must poll for updates
const checkStatus = async () => {
  const response = await fetch(
    `http://localhost:3001/api/generations/${generationId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  console.log('Status:', data.status); // Should change from pending → processing → success
};
```

### Issue: "status: processing" forever

**Possible causes:**
1. **Worker not running** → Check backend logs for "✓ Generation worker started"
2. **Job failed silently** → Check backend error logs
3. **Gemini API key invalid** → Check GEMINI_API_KEY in .env (vision input on `gemini-2.5-flash` is free tier)
4. **Gemini Vision quota exceeded** → Free tier has per-minute limits; wait and retry
5. **Pollinations unreachable** → Check internet / Pollinations status
6. **inputImage payload too large** → Default body limit is 15 MB; reduce image size client-side

**Solution:**
```bash
# Check backend logs
# Look for "✓ Job completed" or "✗ Job failed"
# Look for error messages with stack traces
```

### Issue: "401 Unauthorized"

**Causes:**
- Missing Authorization header
- Token is incorrect
- Token is expired (shouldn't happen - tokens don't expire)

**Solution:**
```typescript
// ✅ Correct header format
fetch('http://localhost:3001/api/generations', {
  headers: {
    'Authorization': `Bearer ${token}`, // Must have "Bearer " prefix
    'Content-Type': 'application/json'
  }
})
```

### Issue: "400 Prompt is required"

**Causes:**
- Missing `prompt` field in request body
- Prompt is empty string

**Solution:**
```typescript
// ✅ Correct request body
{
  "prompt": "Your design description here", // Required, non-empty
  "style": "minimalist",    // Optional
  "aspectRatio": "16:9"     // Optional
}
```

## Timings

| Phase | Time | Notes |
|-------|------|-------|
| POST → Get ID | < 100ms | Immediate |
| Save inputImage (if any) | < 200ms | Disk write |
| Queue job | < 100ms | Immediate |
| Describe inputImage (Gemini Vision) | 1-3s | only when inputImage present |
| Generate image (Pollinations) | 5-15s | `width`/`height` from aspectRatio |
| Save image | < 1s | Disk write |
| **Total** | **6-19s** | with inputImage; 5-15s without |

## Architecture Diagram

```
Frontend                Backend              Redis               Storage
  │                       │                    │                   │
  ├─ POST generation ──>  │                    │                   │
  │                       ├─ Create record ──> MongoDB            │
  │  (201 response)       │                    │                   │
  │ {id, status:pending}  ├─ Queue job ──────> │                   │
  │  <────────────────────┤                    │                   │
  │                       │                    │                   │
  │ (Poll GET every 2s)   │   Worker picks     │                   │
  │  ────────────────>    │   up job ─────>    │                   │
  │                       │   status:         │                   │
  │  {status:processing}  │   processing      │                   │
  │  <────────────────────┤                    │                   │
  │                       │   Load inputImage from disk (if any)  │
  │                       │   Gemini Vision: describe image       │
  │                       │   Build finalPrompt                   │
  │                       │   Pollinations: generate image        │
  │                       │   Save image ─────────────────────>   │
  │ (Poll GET again)      │   Update DB                           │
  │  ────────────────>    │   status:success                      │
  │                       │                    │                   │
  │  {status:success,     │                    │                   │
  │   imageUrl:...}       │                    │                   │
  │  <────────────────────┤                    │                   │
  │                       │                    │                   │
  ├─ GET /api/images/... ────────────────────────────────────>   │
  │                       │                    │                   │
  │  <image data───────────────────────────────────────────────────┤
```

## Next Steps

1. **Ensure services running:**
   - MongoDB: `mongod`
   - Redis: `redis-server`

2. **Check backend logs** for worker startup

3. **Test with curl:**
   ```bash
   TOKEN="your_token_here"
   curl -X POST http://localhost:3001/api/generations \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"Modern living room"}'
   ```

4. **Implement frontend polling** - Don't just fire and forget!

5. **Monitor backend logs** for any errors during processing
