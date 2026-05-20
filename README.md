# RoomVision AI — Backend

AI-powered interior design image generator. A user uploads a photo of their room, picks a Room type and a Style, optionally describes what they want changed, and gets a photorealistic re-render. Designs are saved server-side and grouped into iterable threads — pick any saved result, tweak the prompt, and regenerate without starting over.

This repository is the **backend service**. It exposes a REST API, runs an async BullMQ worker that calls Gemini 2.5 Flash Image directly, persists generations in MongoDB, and stores image bytes on disk.

The frontend (Next.js) lives in a separate repository.

**Stack:** Node.js · TypeScript · Express · MongoDB · Redis (BullMQ) · Gemini 2.5 Flash Image.

---

## How to install

Tested end-to-end in under 15 minutes from a clean clone.

### 1. Prerequisites

- Node.js 18+ and npm
- Docker (for local Mongo + Redis), or accounts on Mongo Atlas / Redis Cloud
- A Google Gemini API key — get one at https://aistudio.google.com/app/apikey
- A Google OAuth 2.0 Client ID — Google Cloud Console → APIs & Services → Credentials → "Create OAuth client ID" (Web application). Add `http://localhost:3000` to Authorized JavaScript origins.

### 2. Clone and install

```bash
git clone git@github.com:faisalihsanulfikri/rvai-api.git
cd rvai-api
npm install
```

### 3. Start MongoDB and Redis locally

```bash
docker run -d -p 27017:27017 --name rvai-mongo mongo:latest
docker run -d -p 6379:6379 --name rvai-redis redis:latest
```

Skip this step if you're pointing `MONGODB_URI` and `REDIS_URL` at managed instances.

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in at minimum:

```
PORT=3001
FRONTEND_URL=http://localhost:3000

MONGODB_URI=mongodb://localhost:27017/roomvision-ai
REDIS_URL=redis://localhost:6379

GEMINI_API_KEY=<your-gemini-key>          # required
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image  # default, no need to change
GEMINI_TIMEOUT_MS=60000                    # per-call timeout, default 60s

GOOGLE_CLIENT_ID=<your-google-client-id>

IMAGE_STORAGE_PATH=./uploads/images
BACKEND_PUBLIC_URL=http://localhost:3001   # used in returned imageUrl
```

### 5. Run

```bash
npm run dev
```

This starts the Express API and the BullMQ worker in the same process. The server listens on `http://localhost:3001`.

### 6. Verify

```bash
curl http://localhost:3001/health
```

Returns `{"status":"ok"}` (or similar) when everything is wired up. If the response hangs or errors, check that Mongo and Redis containers are running (`docker ps`).

---

## Project layout

```
src/
├── modules/
│   ├── auth/         POST /api/auth/verify-google, GET /api/auth/me, ...
│   ├── designs/      GET  /api/designs
│   ├── generations/  POST /api/generations, GET /api/generations/:id, ...
│   └── images/       GET  /api/images/:filename
└── shared/           types, config, middleware
docs/                 system design, API docs, UI docs, Loom prep
uploads/              generated images + user reference photos (gitignored)
```

For deeper module-level docs, see [docs/api/INDEX.md](./docs/api/INDEX.md).
