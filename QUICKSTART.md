# Quick Start - Local Development

Get the RoomVision AI backend running locally in 5 minutes.

## 1. Start Services (Docker)

```bash
# Terminal 1: Start MongoDB
docker run -d -p 27017:27017 --name roomvision-mongo mongo:latest

# Terminal 2: Start Redis
docker run -d -p 6379:6379 --name roomvision-redis redis:latest
```

## 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` and add:
- `GEMINI_API_KEY=your_key_here`
- `GOOGLE_CLIENT_ID=your_client_id`
- `GOOGLE_CLIENT_SECRET=your_client_secret`

## 3. Install & Run

```bash
npm install
npm run dev
```

Backend runs on `http://localhost:3001`

## 4. Test API

```bash
# Get a test token (base64 encoded JSON)
TOKEN=$(node -e "console.log(Buffer.from(JSON.stringify({userId:'test-user-1', email:'test@example.com', name:'Test User'})).toString('base64'))")

# Create a generation
curl -X POST http://localhost:3001/api/generations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Modern minimalist living room with natural light"}'

# List generations
curl http://localhost:3001/api/generations \
  -H "Authorization: Bearer $TOKEN"
```

## Database Tools

### View MongoDB
```bash
docker exec -it roomvision-mongo mongosh
use roomvision-ai
db.generations.find()
```

### View Redis Queue
```bash
docker exec -it roomvision-redis redis-cli
KEYS "bull:*"
HGETALL "bull:image-generation:active"
```

## Stop Services

```bash
docker stop roomvision-mongo roomvision-redis
docker rm roomvision-mongo roomvision-redis
```

## Frontend Integration

Set `NEXT_PUBLIC_API_URL=http://localhost:3001` in frontend `.env`

Then in frontend:
```typescript
const token = new URLSearchParams(window.location.search).get('token');

const response = await fetch('http://localhost:3001/api/generations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: userPrompt,
    style: 'minimalist'
  })
});
```

## Troubleshooting

**Port already in use:**
```bash
# Kill process on port 27017 (MongoDB)
lsof -ti:27017 | xargs kill -9

# Kill process on port 6379 (Redis)
lsof -ti:6379 | xargs kill -9
```

**Queue not processing:**
Check Redis is running and accessible:
```bash
redis-cli ping  # Should respond with PONG
```

**Images not saving:**
Check uploads directory exists:
```bash
mkdir -p uploads/images
```

**Gemini errors:**
Verify API key:
```bash
node -e "require('dotenv').config(); console.log(process.env.GEMINI_API_KEY)"
```
