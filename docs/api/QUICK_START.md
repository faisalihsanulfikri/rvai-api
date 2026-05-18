# Quick Start Guide

Get the RoomVision AI backend running in 5 minutes.

---

## 📋 Prerequisites

- **Node.js** - v16+ installed
- **MongoDB** - Running on localhost:27017
- **Redis** - Running on localhost:6379
- **Environment file** - `.env` configured

---

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install
```
**Expected**: 168 packages, 0 errors

### 2. Configure Environment
```bash
# Copy template (or use existing)
cat .env

# Verify these are set:
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/roomvisionai
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=<your_key>
```

### 3. Start Services
```bash
# Terminal 1: MongoDB
mongod

# Terminal 2: Redis
redis-server

# Terminal 3: Backend
npm run dev
```

**Expected output**:
```
✓ Redis connected
✓ Database connected
✓ Storage initialized
✓ Generation worker started
✓ Server running on http://localhost:3001
✓ API endpoints ready
✓ Queue processor active
```

---

## 🧪 Test the API

### Test Authentication

**Step 1**: Get Google ID token from frontend
- Use [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)
- Or use [Google Sign-In](https://developers.google.com/identity/gsi/web)

**Step 2**: Verify token with backend
```bash
TOKEN="<google_id_token>"

curl -X POST http://localhost:3001/api/auth/verify-google \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"
```

**Expected response** (201):
```json
{
  "id": "auth",
  "status": "success",
  "data": {
    "token": "base64_encoded_token",
    "user": {
      "id": "mongodb_id",
      "email": "user@example.com",
      "name": "User Name",
      "picture": "url"
    }
  }
}
```

**Save the token**:
```bash
APP_TOKEN="<token from response>"
```

### Test Current User

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $APP_TOKEN"
```

**Expected response** (200):
```json
{
  "id": "mongodb_id",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "url"
}
```

### Test Image Generation

**Create generation**:
```bash
curl -X POST http://localhost:3001/api/generations \
  -H "Authorization: Bearer $APP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Modern minimalist living room with natural light",
    "style": "minimalist",
    "aspectRatio": "16:9"
  }'
```

**Expected response** (201):
```json
{
  "id": "generation_id_123",
  "userId": "user_id",
  "originalPrompt": "Modern minimalist living room with natural light",
  "finalPrompt": "Modern minimalist living room with natural light",
  "status": "pending",
  "createdAt": "2024-05-18T10:30:00Z",
  "updatedAt": "2024-05-18T10:30:00Z"
}
```

**Save the generation ID**:
```bash
GEN_ID="<id from response>"
```

**Poll for status** (repeat every 2 seconds):
```bash
curl -X GET http://localhost:3001/api/generations/$GEN_ID \
  -H "Authorization: Bearer $APP_TOKEN"
```

**Status progression**:
```
1. status: "pending"    # Job queued
2. status: "processing" # Enhancing prompt & generating
3. status: "success"    # Image ready!
```

**When success**:
```json
{
  "id": "generation_id_123",
  "status": "success",
  "imageUrl": "http://localhost:3001/api/images/filename.jpg",
  "finalPrompt": "Enhanced description...",
  "imageFilename": "filename.jpg"
}
```

### Test Image Download

```bash
curl -X GET "http://localhost:3001/api/images/filename.jpg" \
  --output image.jpg
```

**Verify**: Image file should download successfully

### Test List Generations

```bash
curl -X GET http://localhost:3001/api/generations \
  -H "Authorization: Bearer $APP_TOKEN"
```

**Expected**: Array of all user's generations

---

## 📖 Documentation Map

### Essential Reading
1. **[overview.md](./overview.md)** - Start here for API basics
2. **[auth.md](./auth.md)** - Authentication endpoints
3. **[generations.md](./generations.md)** - Image generation

### Implementation Guides
1. **[GENERATION_FLOW.md](./GENERATION_FLOW.md)** - How async generation works
2. **[AUTHENTICATION_UPDATE.md](./AUTHENTICATION_UPDATE.md)** - Auth system architecture
3. **[examples.md](./examples.md)** - Code examples in multiple languages

### Troubleshooting
1. **[errors.md](./errors.md)** - Error codes and solutions
2. **[SESSION_REVIEW_2026_05_18.md](./SESSION_REVIEW_2026_05_18.md)** - Detailed session notes

---

## ✅ Verification Checklist

Before moving to frontend integration:

- [ ] `npm install` completes successfully
- [ ] `npm run build` produces dist/ folder
- [ ] `npm run dev` shows all ✓ messages
- [ ] `redis-cli ping` returns PONG
- [ ] `mongosh` connects to database
- [ ] POST /verify-google returns token
- [ ] GET /me returns user profile
- [ ] POST /generations creates generation
- [ ] GET /generations/:id shows status changes
- [ ] Status eventually reaches "success"
- [ ] Image URL is accessible

✅ **All checks passing?** Ready to integrate frontend!

---

## 🔗 Frontend Integration

### What Frontend Needs

1. **Google Sign-In library**
   ```bash
   npm install @react-oauth/google
   ```

2. **Call `/verify-google` endpoint**
   ```typescript
   const response = await fetch('http://localhost:3001/api/auth/verify-google', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ token: googleToken })
   });
   ```

3. **Store token**
   ```typescript
   const token = response.data.token;
   localStorage.setItem('auth_token', token);
   ```

4. **Include token in requests**
   ```typescript
   headers: { Authorization: `Bearer ${token}` }
   ```

5. **Poll for generation results**
   ```typescript
   // Every 2 seconds, check:
   GET /api/generations/:id
   // Until status = "success"
   ```

See [GENERATION_FLOW.md](./GENERATION_FLOW.md) for complete React example.

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
npm run dev

# Look for errors:
# ✗ Redis connected       → Start Redis
# ✗ Database connected    → Start MongoDB
# ✗ Error: ENOENT         → Missing .env file
```

### API returns 401 Unauthorized
```bash
# Check token format
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me

# Common issues:
# - Missing "Bearer " prefix
# - Token is expired (shouldn't happen)
# - Wrong token (get new one from /verify-google)
```

### Generation never completes
```bash
# Check backend logs for:
# ✓ Job completed  = Success
# ✗ Job failed     = Error occurred

# Common causes:
# - GEMINI_API_KEY invalid
# - Network error calling APIs
# - Worker not started
```

### Image file not found
```bash
# Check in generation response:
# "imageFilename": "...",
# "imageUrl": "http://localhost:3001/api/images/..."

# Verify file exists:
ls ./uploads/images/
```

---

## 📞 Need Help?

1. **Check logs** - Backend logs often tell you exactly what's wrong
2. **Read errors.md** - Comprehensive error reference
3. **Review GENERATION_FLOW.md** - Async flow diagram
4. **Check SESSION_REVIEW** - Session notes and design decisions

---

## 🎯 What's Next?

1. ✅ Backend running locally
2. ⏳ Frontend setup and testing
3. ⏳ End-to-end integration testing
4. ⏳ Deploy to production

---

**Version**: 1.1.0 (May 18, 2026)  
**Status**: ✅ Production Ready
