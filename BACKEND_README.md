# RoomVision AI - Backend

Node.js backend for RoomVision AI interior design generator.

## Architecture

```
Frontend (Next.js)
    ↓
Express API (Node.js)
    ↓
┌─────────────────────────────────────────┐
│  MongoDB     │  BullMQ Queue  │  Redis  │
│  (Data)      │  (Image Gen)   │ (Cache) │
└─────────────────────────────────────────┘
    ↓
Gemini API (Prompt Enhancement)
    ↓
Pollinations.ai (Image Generation)
    ↓
Local Filesystem (Image Storage)
```

## Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- Redis (for BullMQ)
- Gemini API key
- Google OAuth credentials

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required variables:
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_CALLBACK_URL` - OAuth callback URL
- `FRONTEND_URL` - Frontend URL for redirects

### 3. Local Development Setup

**MongoDB (Docker):**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Redis (Docker):**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### 4. Get API Keys

**Gemini API:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add to `.env`

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials (Web application)
3. Add redirect URI: `http://localhost:3001/api/auth/google/callback`
4. Add to `.env`

### 5. Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google login
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/me` - Get current user (requires token)
- `POST /api/auth/logout` - Logout

### Generations
- `POST /api/generations` - Create new generation
- `GET /api/generations` - List user's generations
- `GET /api/generations/:id` - Get specific generation
- `POST /api/generations/:id/regenerate` - Regenerate with new prompt
- `DELETE /api/generations/:id` - Delete generation

### Images
- `GET /api/images/:filename` - Serve generated image

## Request Examples

### Create Generation

```bash
curl -X POST http://localhost:3001/api/generations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Modern minimalist living room",
    "style": "minimalist",
    "aspectRatio": "16:9"
  }'
```

Response:
```json
{
  "id": "uuid",
  "status": "pending",
  "originalPrompt": "Modern minimalist living room",
  "finalPrompt": "Modern minimalist living room",
  "createdAt": "2024-05-18T10:30:00Z"
}
```

### Get Token After OAuth

After Google OAuth completes, user is redirected with token:
```
http://localhost:3000?token=BASE64_ENCODED_TOKEN
```

Use in requests:
```bash
Authorization: Bearer YOUR_TOKEN
```

## Project Structure

```
src/
├── config/           # Configuration
│   ├── database.ts   # MongoDB connection
│   ├── redis.ts      # Redis connection
│   └── gemini.ts     # Gemini API setup
├── models/           # MongoDB schemas
│   ├── user.ts
│   └── generation.ts
├── controllers/      # Request handlers
│   ├── auth.controller.ts
│   └── generation.controller.ts
├── services/         # Business logic
│   ├── image.service.ts
│   └── ai-generation.service.ts
├── queue/            # BullMQ job processor
│   └── generation-processor.ts
├── routes/           # API routes
│   ├── auth.ts
│   ├── generations.ts
│   └── images.ts
├── middleware/       # Express middleware
│   └── auth.ts
├── types/            # TypeScript types
│   └── index.ts
├── app.ts            # Express app setup
└── index.ts          # Entry point
```

## Image Generation Flow

1. **User** submits prompt via frontend
2. **API** creates Generation record (status: pending)
3. **Queue** processes job asynchronously
4. **Gemini** enhances the prompt
5. **Pollinations.ai** generates image
6. **Image** saved to local filesystem
7. **Generation** updated with status: success, imageUrl
8. **Frontend** polls or receives update via WebSocket (optional)

## Database Schema

### User
```
{
  googleId: String (unique)
  email: String (unique)
  name: String
  picture: String
  createdAt: Date
  updatedAt: Date
}
```

### Generation
```
{
  userId: String (indexed with createdAt for sorting)
  originalPrompt: String
  finalPrompt: String
  imageUrl: String
  imageFilename: String
  status: 'pending' | 'processing' | 'success' | 'failed'
  errorMessage: String (optional)
  style: 'minimalist' | 'modern' | 'industrial' | 'japandi'
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3'
  createdAt: Date
  updatedAt: Date
}
```

## Error Handling

Queue jobs retry up to 3 times with exponential backoff:
- Attempt 1: immediate
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds

Failed generations get error message and status: failed

## Production Deployment

### Environment Setup
```bash
NODE_ENV=production
FRONTEND_URL=https://your-frontend.com
MONGODB_URI=your-mongodb-connection
REDIS_URL=your-redis-url
```

### Build
```bash
npm run build
npm start
```

### Recommended Platforms
- **Backend**: Railway, Heroku, AWS EC2, DigitalOcean
- **Database**: MongoDB Atlas
- **Cache**: Redis Cloud
- **Storage**: Local filesystem or cloud (S3, GCS)

## Monitoring & Logs

Monitor Redis queue jobs:
```bash
# View pending jobs
MONITOR redis-cli KEYS "bull:image-generation:*"

# View active jobs
redis-cli HGETALL "bull:image-generation:active"
```

Monitor generation status:
```bash
# Check failed generations
curl http://localhost:3001/api/generations | jq '.[] | select(.status=="failed")'
```

## Security Notes

- Validate all user inputs on backend
- Sanitize prompts before sending to AI APIs
- Rate limit API endpoints (TODO)
- Use HTTPS in production
- Store sensitive keys in environment variables
- Implement request signing for AI API calls
- Add CSRF protection for forms

## Troubleshooting

### MongoDB Connection Failed
- Check MongoDB is running: `docker ps | grep mongodb`
- Verify `MONGODB_URI` in `.env`

### Redis Connection Failed
- Check Redis is running: `docker ps | grep redis`
- Verify `REDIS_URL` in `.env`

### Image Generation Timeout
- Check Pollinations.ai is accessible
- Verify internet connection
- Check rate limits

### Gemini API Errors
- Verify `GEMINI_API_KEY` is correct
- Check API quota at Google Cloud Console

## Next Steps

- [ ] Add WebSocket support for real-time updates
- [ ] Implement rate limiting
- [ ] Add request validation (joi/yup)
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Add tests (Jest)
- [ ] Add monitoring/logging (Winston, DataDog)
- [ ] Optimize image storage (cloud storage)
- [ ] Add batch image generation
- [ ] Implement pagination
- [ ] Add analytics

## Support

For issues, check:
1. Environment variables are set correctly
2. Services are running (MongoDB, Redis)
3. API keys are valid
4. Network connectivity
