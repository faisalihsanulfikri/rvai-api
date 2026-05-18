# Modular Monolith Architecture

## Overview

The RoomVision AI backend uses a **modular monolith pattern**, which combines the simplicity of a monolithic architecture with the organizational benefits of microservices through feature-based modules.

## Structure

```
src/
├── shared/                 # Shared kernel (config, types, middleware)
│   ├── config/            # External service setup
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── index.ts
│   ├── middleware/        # Reusable middleware
│   │   ├── auth.ts
│   │   └── index.ts
│   └── types/            # Shared TypeScript interfaces
│       └── index.ts
│
├── modules/               # Feature modules
│   ├── auth/             # Authentication domain
│   │   ├── auth.types.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.route.ts
│   │   ├── google.strategy.ts
│   │   ├── user.model.ts
│   │   └── index.ts      # Public API
│   │
│   ├── generations/      # Image generation domain
│   │   ├── generation.types.ts
│   │   ├── generation.model.ts
│   │   ├── generation.service.ts
│   │   ├── generation.controller.ts
│   │   ├── generation.route.ts
│   │   ├── generation.queue.ts
│   │   ├── ai.service.ts
│   │   ├── image-storage.service.ts
│   │   └── index.ts      # Public API
│   │
│   ├── images/          # Image serving domain
│   │   ├── image.controller.ts
│   │   ├── image.service.ts
│   │   ├── image.route.ts
│   │   └── index.ts     # Public API
│   │
│   └── index.ts         # Module aggregator
│
├── app.ts               # Express app initialization
└── index.ts             # Server entry point
```

## Module Anatomy

Each module is self-contained and follows this pattern:

```
module-name/
├── {name}.types.ts           # Type definitions (API contracts)
├── {name}.model.ts           # Database schema (if needed)
├── {name}.service.ts         # Business logic
├── {name}.controller.ts      # Request handlers
├── {name}.route.ts           # Express routes
├── {name}.queue.ts           # Async jobs (if needed)
├── additional.service.ts     # Domain-specific services
└── index.ts                  # Public API exports
```

### Key Principles

1. **Single Responsibility**: Each module handles one domain
2. **Encapsulation**: Internal implementation details are private
3. **Public API**: Each module exports only what's needed via `index.ts`
4. **Database Isolation**: Models belong to their domain module
5. **No Cross-Module Imports**: Modules import from `shared/` or their own folder

## Modules

### 1. Auth Module (`src/modules/auth/`)

Handles user authentication and profile management.

**Public API** (via `index.ts`):
- `authRouter` - Express routes
- `createGoogleStrategy()` - Passport strategy
- `UserModel` - User database model
- `findOrCreateUser()` - Service function
- `generateToken()` - Token generation

**Internal Files**:
- `auth.types.ts` - Type definitions
- `auth.service.ts` - Business logic
- `auth.controller.ts` - Request handlers
- `auth.route.ts` - Route definitions
- `google.strategy.ts` - Passport strategy setup
- `user.model.ts` - MongoDB schema

**Responsibilities**:
- Google OAuth authentication
- User creation and updates
- Token generation
- Current user endpoint

### 2. Generations Module (`src/modules/generations/`)

Handles image generation, storage, and gallery management.

**Public API** (via `index.ts`):
- `generationRouter` - Express routes
- `GenerationModel` - Generation database model
- `startWorker()` - BullMQ worker
- `queueGeneration()` - Queue a job
- `initializeStorage()` - Setup storage directory
- Service functions: `createGeneration()`, `getGenerationsByUser()`, etc.

**Internal Files**:
- `generation.types.ts` - Type definitions
- `generation.model.ts` - MongoDB schema
- `generation.service.ts` - Business logic
- `generation.controller.ts` - Request handlers
- `generation.route.ts` - Route definitions
- `generation.queue.ts` - BullMQ processor
- `ai.service.ts` - AI API integration (Gemini, Pollinations)
- `image-storage.service.ts` - File system operations

**Responsibilities**:
- Create/list/get/update/delete generations
- Queue image generation jobs
- Enhance prompts with Gemini
- Generate images with Pollinations.ai
- Manage image files
- Database persistence

### 3. Images Module (`src/modules/images/`)

Handles image serving and retrieval.

**Public API** (via `index.ts`):
- `imageRouter` - Express routes
- `getImageBuffer()` - Service function

**Internal Files**:
- `image.controller.ts` - Request handlers
- `image.service.ts` - File operations
- `image.route.ts` - Route definitions

**Responsibilities**:
- Serve generated images
- Validate filenames (security)
- File retrieval

## Shared Folder (`src/shared/`)

Common utilities and configurations shared across modules.

### Config (`src/shared/config/`)
- `database.ts` - MongoDB connection
- `redis.ts` - Redis connection setup

### Middleware (`src/shared/middleware/`)
- `auth.ts` - Token validation middleware

### Types (`src/shared/types/`)
- Shared TypeScript interfaces
- `GenerationStatus`, `DesignStyle`, `AspectRatio`
- `User`, `Generation`, `AuthUser`, `GenerationJob`

## Communication Flow

### Adding a Feature

Example: Adding a new "favorites" feature

1. **Create new module** `src/modules/favorites/`
2. **Define types** in `generation.types.ts`
3. **Create model** `favorite.model.ts`
4. **Implement service** `favorite.service.ts`
5. **Add controller** `favorite.controller.ts`
6. **Define routes** `favorite.route.ts`
7. **Export API** in `index.ts`
8. **Register router** in `app.ts`

```typescript
// app.ts
import { favoriteRouter } from './modules/favorites/index.js';
app.use('/api/favorites', favoriteRouter);
```

### Inter-Module Communication

Modules should communicate through **services**, not routes:

```typescript
// ❌ Don't do this (circular dependency)
import { generationRouter } from '../generations/index.js';

// ✅ Do this (service call)
import { getGenerationsByUser } from '../generations/index.js';
const generations = await getGenerationsByUser(userId);
```

### Using Shared Utilities

Modules can import from `shared/`:

```typescript
import { authMiddleware } from '../../shared/middleware/index.js';
import { User, Generation } from '../../shared/types/index.js';
import { connectDatabase } from '../../shared/config/index.js';
```

## Benefits of Modular Monolith

### 1. **Scalability**
- Easy to understand individual modules
- Simple to add new features
- Can be split into microservices later if needed

### 2. **Maintainability**
- Clear code organization
- Reduced cognitive load
- Easier to find and modify features

### 3. **Testing**
- Test each module independently
- Mock dependencies easily
- Clear service boundaries

### 4. **Teamwork**
- Teams can work on different modules in parallel
- Clear ownership boundaries
- Reduced merge conflicts

### 5. **Deployment**
- Single deployment unit
- No service orchestration overhead
- Easier debugging with single codebase

## Folder Structure Best Practices

### Do:
```
✓ Each module has clear responsibility
✓ Internal files stay internal
✓ Public API clearly defined in index.ts
✓ Types colocated with module
✓ Services handle business logic
✓ Controllers handle HTTP concerns
```

### Don't:
```
✗ Don't import across modules (except shared)
✗ Don't expose internal services
✗ Don't mix responsibilities
✗ Don't put models in shared folder
✗ Don't put routes in shared folder
```

## Migration Path to Microservices

If the app grows, modules can become microservices:

```
Auth Module    → Auth Service (Node.js)
Generations    → Generation Service (Node.js)
Images         → Image Service (Node.js)
```

Each module already has:
- ✅ Own database access
- ✅ Own routes
- ✅ Own service layer
- ✅ Clear boundaries

Just extract to separate Node.js processes, add API Gateway, and you have microservices!

## Code Examples

### How to Add a New Endpoint

1. **Add controller method** (`generation.controller.ts`):
```typescript
export async function search(req: Request, res: Response) {
  const { query } = req.query;
  // implementation
}
```

2. **Add route** (`generation.route.ts`):
```typescript
router.get('/search', authMiddleware, controller.search);
```

3. **Route is now available** at `GET /api/generations/search`

### How to Add a New Service Function

1. **Add service function** (`generation.service.ts`):
```typescript
export async function searchGenerations(userId: string, query: string) {
  return GenerationModel.find({
    userId,
    $text: { $search: query }
  });
}
```

2. **Export from index.ts**:
```typescript
export * from './generation.service.js';
```

3. **Use in controller**:
```typescript
const results = await generationService.searchGenerations(userId, query);
```

## Summary

The modular monolith pattern gives you:

- 📦 **Organization** - Clear folder structure
- 🔒 **Encapsulation** - Hidden implementation details
- 🔌 **Modularity** - Easy to add/remove features
- 📈 **Scalability** - Can grow or split as needed
- 👥 **Teamwork** - Clear boundaries for collaboration

Perfect for AI-as-a-Service projects where you need structure but not microservices complexity!
