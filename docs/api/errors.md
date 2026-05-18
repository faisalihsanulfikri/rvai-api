# Error Reference

Complete guide to error codes and handling.

---

## HTTP Status Codes

| Code | Name | Meaning |
|------|------|---------|
| `200` | OK | Request succeeded |
| `201` | Created | Resource created |
| `400` | Bad Request | Invalid input, client error |
| `401` | Unauthorized | Missing/invalid authentication |
| `404` | Not Found | Resource doesn't exist |
| `500` | Internal Server Error | Server error |

---

## Error Response Format

All errors return JSON:

```json
{
  "error": "Human-readable error message"
}
```

**Example**:
```json
{
  "error": "Prompt is required"
}
```

---

## Authentication Errors (401)

### No Token Provided

**Message**: `No token provided`

**Cause**: Missing `Authorization` header

**Fix**: Add header with token
```bash
curl -H "Authorization: Bearer <token>" ...
```

---

### Invalid Token

**Message**: `Invalid token`

**Cause**: 
- Malformed token
- Corrupted base64
- Wrong format

**Fix**: Get new token from OAuth flow

**Debug**:
```javascript
try {
  const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
  console.log(decoded);
} catch (e) {
  console.error('Invalid token format', e);
}
```

---

### Unauthorized

**Message**: `Unauthorized`

**Cause**:
- Token user doesn't own resource
- Accessing another user's data

**Fix**: Use correct token or check generation ID

---

## Validation Errors (400)

### Prompt is Required

**Message**: `Prompt is required`

**Endpoint**: `POST /api/generations`, `POST /api/generations/:id/regenerate`

**Cause**: Empty or missing prompt

**Fix**: Provide non-empty prompt
```javascript
const response = await fetch('/api/generations', {
  method: 'POST',
  body: JSON.stringify({
    prompt: "Your design description here"  // Required
  })
});
```

---

### Invalid Filename

**Message**: `Invalid filename`

**Endpoint**: `GET /api/images/:filename`

**Cause**: Filename contains invalid characters

**Valid Format**: `[a-zA-Z0-9\-_.]+\.(jpg|jpeg|png|webp)`

**Examples**:
- ✅ `550e8400-e29b-41d4-a716-446655440000.jpg`
- ❌ `../../../etc/passwd.jpg` (path traversal)
- ❌ `image with spaces.jpg` (spaces)
- ❌ `image.gif` (wrong extension)

---

## Resource Errors (404)

### Generation Not Found

**Message**: `Generation not found`

**Endpoints**: 
- `GET /api/generations/:id`
- `POST /api/generations/:id/regenerate`
- `DELETE /api/generations/:id`

**Cause**:
- Wrong generation ID
- Generation belongs to different user
- Generation deleted

**Fix**: 
- Check generation ID from list
- Verify you own the generation
- Create new generation if deleted

**Debug**:
```javascript
const generations = await fetch('/api/generations', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());
console.log(generations); // Find correct ID
```

---

### Image Not Found

**Message**: `Image not found`

**Endpoint**: `GET /api/images/:filename`

**Cause**:
- Image file deleted
- Wrong filename
- Generation deleted

**Fix**:
- Check generation.imageUrl
- Regenerate the design

---

### User Not Found

**Message**: `User not found`

**Endpoint**: `GET /api/auth/me`

**Cause**: Token references deleted user (shouldn't happen)

**Fix**: Get new token from OAuth

---

## Server Errors (500)

### Failed to Create Generation

**Message**: `Failed to create generation`

**Endpoint**: `POST /api/generations`

**Cause**:
- Database error
- Queue system down
- Out of memory

**Fix**:
- Retry after a few seconds
- Check server status
- Contact support if persists

---

### Failed to Fetch Generations

**Message**: `Failed to fetch generations`

**Endpoint**: `GET /api/generations`

**Cause**: Database connection error

**Fix**: Check MongoDB is running
```bash
docker ps | grep mongodb
```

---

### Failed to Fetch Generation

**Message**: `Failed to fetch generation`

**Endpoint**: `GET /api/generations/:id`

**Cause**: Database error

**Fix**: Retry or contact support

---

### Failed to Regenerate Design

**Message**: `Failed to regenerate design`

**Endpoint**: `POST /api/generations/:id/regenerate`

**Cause**:
- Database error
- Queue system error

**Fix**: Retry operation

---

### Failed to Delete Generation

**Message**: `Failed to delete generation`

**Endpoint**: `DELETE /api/generations/:id`

**Cause**:
- Database error
- File system error

**Fix**: Retry or contact support

---

## Queue Processing Errors

These errors occur during async image generation, stored in `errorMessage`:

### Image Generation Failed

**Cause**: AI API error

**Example**:
```json
{
  "status": "failed",
  "errorMessage": "Failed to generate image: Service Unavailable"
}
```

**Fix**: Check if Pollinations.ai is available, regenerate

---

### API Rate Limit Exceeded

**Cause**: Too many requests to Gemini/Pollinations

**Example**:
```json
{
  "status": "failed",
  "errorMessage": "API rate limit exceeded, please try again later"
}
```

**Fix**: Wait a few minutes, regenerate

---

## Error Handling Best Practices

### Frontend

```typescript
try {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.json();
    console.error(`Error ${response.status}: ${error.error}`);
    // Show error to user
    setError(error.error);
    return;
  }
  
  const data = await response.json();
  // Process data
} catch (error) {
  console.error('Network error:', error);
  setError('Network error occurred');
}
```

### Retry Logic

```typescript
async function retryWithBackoff(fn, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// Usage
await retryWithBackoff(() => api.generations.create(data));
```

### Error Messages

**Good** (user-friendly):
```
"Failed to generate image. Please try again."
"Your prompt was too short. Please add more details."
```

**Bad** (technical jargon):
```
"MongoError: connection refused"
"ECONNREFUSED 127.0.0.1:27017"
```

---

## Debugging

### Check Token

```javascript
const token = localStorage.getItem('auth_token');
console.log('Token:', token);

const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
console.log('Decoded:', decoded);
```

### Check Server Status

```bash
# Is backend running?
curl http://localhost:3001/health

# Are services running?
docker ps

# MongoDB
docker exec -it mongodb mongosh
use roomvision-ai
db.generations.find()

# Redis
docker exec -it redis redis-cli
KEYS "bull:*"
```

### Check Logs

```bash
# Backend logs
npm run dev  # See console output

# Docker logs
docker logs mongodb
docker logs redis
```

### Network Inspector

```javascript
// Add to every fetch for debugging
fetch(url, options)
  .then(r => {
    console.log(`${r.status} ${r.statusText}`, r.headers);
    return r;
  })
  .then(r => r.json())
  .catch(e => console.error('Request failed:', e));
```

---

## Common Scenarios

### User clicks generate but nothing happens

**Possible causes**:
1. No token → 401 Unauthorized
2. Network error → Can't reach server
3. Prompt is empty → 400 Bad Request
4. Server down → 500 Error

**Debug**:
```javascript
// Check token
console.log('Token:', localStorage.getItem('auth_token'));

// Check network
fetch('http://localhost:3001/health')
  .then(r => r.json())
  .then(d => console.log('Server OK:', d))
  .catch(e => console.error('Server down:', e));

// Check prompt
console.log('Prompt:', prompt);
if (!prompt?.trim()) console.error('Prompt is empty!');
```

---

### Gallery doesn't load

**Possible causes**:
1. Token invalid → 401
2. No generations yet → Empty list (OK)
3. Database down → 500
4. Network error → Can't reach server

**Debug**:
```javascript
const token = localStorage.getItem('auth_token');
fetch('http://localhost:3001/api/generations', {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(d => console.log('Generations:', d))
  .catch(e => console.error('Error:', e));
```

---

### Image won't load

**Possible causes**:
1. Generation still processing → imageUrl is null
2. Image file deleted → 404
3. Wrong imageUrl → 404
4. Server down → Can't serve image

**Debug**:
```javascript
// Check generation status
const gen = await fetch(`/api/generations/${id}`).then(r => r.json());
console.log('Status:', gen.status);
console.log('ImageUrl:', gen.imageUrl);

// Check image directly
fetch(gen.imageUrl)
  .then(r => console.log('Image status:', r.status))
  .catch(e => console.error('Image error:', e));
```

---

## Future Error Handling

Planned improvements:

- [ ] Error codes (INVALID_PROMPT, API_TIMEOUT, etc.)
- [ ] Detailed error messages with suggestions
- [ ] Error recovery instructions
- [ ] Rate limit headers
- [ ] Request ID tracking for support
- [ ] Error analytics and monitoring
