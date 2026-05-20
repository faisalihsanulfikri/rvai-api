# RoomVision AI - Backend Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (3000)                  │
│  PromptForm → API Call → Gallery → Detail & Regenerate     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ↓
┌─────────────────────────────────────────────────────────────┐
│             Express.js Backend (3001)                       │
│ ┌──────────────────────────────────────────────────────────┤
│ │ Routes:                                                  │
│ │  • POST   /api/generations         → Create generation  │
│ │  • GET    /api/generations         → List user's        │
│ │  • GET    /api/generations/:id     → Get detail        │
│ │  • DELETE /api/generations/:id     → Delete            │
│ │  • GET    /api/auth/google         → OAuth login       │
│ │  • GET    /api/auth/google/callback → OAuth callback   │
│ │  • GET    /api/auth/me             → Current user      │
│ │  • GET    /api/images/:filename    → Serve image       │
│ └──────────────────────────────────────────────────────────┤
│                                                              │
│ Middleware:                                                 │
│  • CORS (allow frontend)                                   │
│  • JSON parsing                                            │
│  • Passport.js (Google OAuth)                              │
│  • Authentication (token validation)                       │
│ └──────────────────────────────────────────────────────────┘
└──────────┬───────────────────────┬───────────────────────┬──┘
           │                       │                       │
           ↓                       ↓                       ↓
    ┌─────────────┐      ┌─────────────────┐    ┌──────────────┐
    │  MongoDB    │      │  BullMQ Queue   │    │ Local FS     │
    │             │      │  + Redis        │    │              │
    │ • User      │      │                 │    │ ./uploads/   │
    │ • Generation│      │ Job Processor   │    │ /images/     │
    └─────────────┘      └────────┬────────┘    └──────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ↓                           ↓
            ┌──────────────────┐    ┌──────────────────────┐
            │  Gemini API      │    │ Pollinations.ai      │
            │  (Prompt         │    │ (Image Generation)   │
            │   Enhancement)   │    │                      │
            └──────────────────┘    └──────────────────────┘
```

## Component Breakdown

### 1. Express Server (`src/app.ts`, `src/index.ts`)

- Initializes Express application
- Configures middleware (CORS, JSON, sessions, Passport)
- Mounts route handlers
- Sets up error handling
- Connects database and starts job processor

### 2. Routes (`src/routes/`)

**Auth Routes** (`auth.ts`):
- `GET /api/auth/google` - Initiates Google OAuth
- `GET /api/auth/google/callback` - Handles OAuth callback
- `GET /api/auth/me` - Returns authenticated user
- `POST /api/auth/logout` - Logs out user

**Generation Routes** (`generations.ts`):
- All routes require authentication middleware
- `POST /api/generations` - Create new generation
- `GET /api/generations` - List user's generations
- `GET /api/generations/:id` - Get specific generation
- `DELETE /api/generations/:id` - Delete generation

**Image Routes** (`images.ts`):
- `GET /api/images/:filename` - Serve stored images
- Validates filename to prevent path traversal

### 3. Controllers (`src/controllers/`)

**Auth Controller** (`auth.controller.ts`):
- `getMe()` - Fetch current user from token
- `logout()` - Clear session

**Generation Controller** (`generation.controller.ts`):
- `createGeneration()` - Create new generation record and queue job
- `getGenerations()` - Fetch user's generations with sorting
- `getGenerationById()` - Fetch specific generation
- `deleteGeneration()` - Delete generation and its image

### 4. Middleware (`src/middleware/`)

**Auth Middleware** (`auth.ts`):
- Validates Bearer token from Authorization header
- Decodes base64 token and extracts userId
- Attaches userId to request object

**Google Callback Middleware** (`google-callback.ts`):
- Processes Passport authentication result
- Creates or updates user in database
- Generates token for frontend
- Redirects to frontend with token in URL

### 5. Models (`src/models/`)

**User Model** (`user.ts`):
- Stores Google OAuth user information
- Indexed by googleId and email for fast lookups
- Fields: googleId, email, name, picture, timestamps

**Generation Model** (`generation.ts`):
- Stores generation records and status
- Indexed by (userId, createdAt) for efficient queries
- Fields: userId, prompts, imageUrl, status, metadata, timestamps

### 6. Services (`src/services/`)

**Image Service** (`image.service.ts`):
- Saves image buffers to local filesystem
- Generates unique filenames with UUID
- Retrieves images by filename
- Deletes images on generation deletion
- Provides secure image URLs

**AI Generation Service** (`ai-generation.service.ts`):
- `enhancePromptWithGemini()` - Calls Gemini API to enhance user prompt
- `generateImageWithPollinationsAI()` - Calls free Pollinations.ai API
- Returns enhanced prompt and image buffer

### 7. Queue Processor (`src/queue/generation-processor.ts`)

**BullMQ Queue**:
- Processes image generation jobs asynchronously
- Jobs queued with ID: `'image-generation'`
- Retries failed jobs 3 times with exponential backoff

**Worker**:
- Listens for jobs in queue
- Updates generation status during processing
- Calls AI services (Gemini for enhancement, Pollinations for generation)
- Saves image to filesystem
- Updates database with results
- Handles errors and stores error messages

### 8. Configuration (`src/config/`)

**Database** (`database.ts`):
- Connects to MongoDB using Mongoose
- Handles connection errors
- Provides disconnect utility

**Redis** (`redis.ts`):
- Creates Redis client for BullMQ
- Connects to configured Redis URL

**Gemini** (`gemini.ts`):
- Initializes Google Generative AI client
- Provides singleton instance

## Data Flow

### 1. Create Generation

```
User Form → POST /api/generations
    ↓
Validate prompt (authMiddleware)
    ↓
Create Generation record (status: pending)
    ↓
Queue job (BullMQ)
    ↓
Return generation object with ID
    ↓
Frontend polls /api/generations/:id
```

### 2. Process Job (Async)

```
BullMQ Worker picks up job
    ↓
Update status: processing
    ↓
Enhance prompt with Gemini
    ↓
Generate image with Pollinations.ai
    ↓
Save image to filesystem
    ↓
Update Generation (status: success, imageUrl, imageFilename)
    ↓
Frontend sees updated status and displays image
```

### 3. Regenerate Design (frontend-only flow)

The dedicated `POST /api/generations/:id/regenerate` endpoint was removed on 2026-05-20. The "Regenerate" UX is now a pure prefill: the frontend navigates to `/generate?prompt=…&image=…&style=…&room=…`, the form is repopulated, and submission goes through the standard `POST /api/generations` create path. Each regenerate therefore produces a brand-new `Generation` row rather than mutating the original.

### 4. Authentication Flow

```
User clicks "Sign in with Google"
    ↓
GET /api/auth/google (Passport redirects to Google)
    ↓
User authorizes app at Google
    ↓
Google redirects to /api/auth/google/callback
    ↓
Passport authenticates with Google
    ↓
handleGoogleCallback middleware
    ↓
Create/update User in MongoDB
    ↓
Generate base64 token
    ↓
Redirect to frontend with ?token=...
    ↓
Frontend extracts token, stores in localStorage
    ↓
All subsequent API calls include: Authorization: Bearer <token>
```

## Security Considerations

1. **Authentication**:
   - Base64-encoded JSON tokens (simple, can upgrade to JWT)
   - Validated on every protected endpoint
   - Includes userId, email, name

2. **Authorization**:
   - All generation endpoints check user ownership
   - Users can only access their own generations
   - MongoDB indexes on (userId, createdAt) prevent data leaks

3. **Image Security**:
   - Filename validation prevents path traversal
   - Images served from restricted directory
   - Only alphanumeric, dash, underscore allowed

4. **CORS**:
   - Restricted to frontend origin
   - Credentials allowed for authentication

5. **Input Validation**:
   - Prompts must be non-empty
   - Filenames validated before access
   - MongoDB prevents injection via Mongoose

## Scalability Considerations

1. **Async Processing**:
   - BullMQ handles concurrent generations
   - Jobs retry on failure
   - No blocking API calls

2. **Database**:
   - Composite index on (userId, createdAt) for fast queries
   - Efficient user ownership checks
   - MongoDB Atlas can scale horizontally

3. **Image Storage**:
   - Local filesystem for development
   - Should migrate to S3/GCS for production
   - Images don't block API responses

4. **Rate Limiting**:
   - TODO: Add per-user rate limits
   - BullMQ can enforce job rate limits

## Environment Variables

```
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/roomvision-ai

# Cache
REDIS_URL=redis://localhost:6379

# APIs
GEMINI_API_KEY=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Storage
IMAGE_STORAGE_PATH=./uploads/images
SESSION_SECRET=change-me-in-production
```

## Error Handling

1. **API Errors**:
   - 400: Invalid input (empty prompt, bad filename)
   - 401: Unauthorized (missing/invalid token)
   - 404: Not found (generation doesn't exist)
   - 500: Server error (logged to console)

2. **Job Failures**:
   - Retries 3 times with exponential backoff
   - Stores error message in Generation.errorMessage
   - Frontend displays error to user

3. **Validation**:
   - Prompt required and non-empty
   - User ownership verified for all actions
   - Filename sanitized for file serving

## Testing

### Manual Testing

```bash
# 1. Start services
docker run -d -p 27017:27017 --name mongodb mongo
docker run -d -p 6379:6379 --name redis redis

# 2. Install & run backend
npm install
npm run dev

# 3. Test endpoints
TOKEN=$(node -e "console.log(Buffer.from(JSON.stringify({userId:'test',email:'test@example.com',name:'Test'})).toString('base64'))")

# Create generation
curl -X POST http://localhost:3001/api/generations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Modern living room"}'

# List generations
curl http://localhost:3001/api/generations \
  -H "Authorization: Bearer $TOKEN"
```

## Performance Metrics

- **Generation time**: 10-30 seconds (image generation)
- **API response time**: <100ms for database queries
- **Concurrent jobs**: Limited by Redis connections (default unlimited)
- **Image size**: Varies by Pollinations.ai (typically 1-3MB)

## Future Improvements

1. Replace base64 tokens with JWT (includes expiration)
2. Add WebSocket for real-time generation updates
3. Migrate image storage to S3/GCS
4. Implement rate limiting per user
5. Add database query monitoring
6. Batch job processing
7. Cache enhanced prompts
8. User preferences (favorite styles, aspect ratios)
9. Generation history/versioning
10. Social features (sharing, comments)
