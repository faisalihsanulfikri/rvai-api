# Data Models

Complete documentation of all data structures in RoomVision AI.

---

## User

Represents an authenticated user who has logged in via Google OAuth.

### Schema

```typescript
interface User {
  id: ObjectId;              // MongoDB unique ID
  googleId: string;          // Google OAuth ID (unique)
  email: string;             // User email (unique, from Google)
  name: string;              // Display name (from Google)
  picture?: string;          // Profile picture URL (from Google)
  createdAt: Date;           // Account creation timestamp
  updatedAt: Date;           // Last profile update
}
```

### Database

**Collection**: `users`

**Indexes**:
- `googleId` (unique)
- `email` (unique)

**Sample Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "googleId": "118364144313267957611",
  "email": "john@example.com",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/a-/AOh14...",
  "createdAt": ISODate("2024-05-18T10:30:00.000Z"),
  "updatedAt": ISODate("2024-05-18T14:45:00.000Z")
}
```

### Fields Explained

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `_id` | ObjectId | MongoDB unique identifier | Auto-generated |
| `googleId` | string | Google OAuth ID | Google OAuth |
| `email` | string | User email | Google OAuth |
| `name` | string | User display name | Google OAuth |
| `picture` | string | Profile picture URL | Google OAuth |
| `createdAt` | Date | Account created timestamp | System |
| `updatedAt` | Date | Profile last updated | System |

### API Response

When returned in API responses, fields are:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/..."
}
```

**Note**: `googleId` is never exposed in API responses (internal only)

### Lifecycle

1. **Creation**: User clicks "Sign in with Google"
2. **Update**: Token refreshed, profile updated
3. **Active**: User can create generations
4. **Deletion**: Manual deletion (no cascade - keeps historical data)

---

## Design

Represents a logical "design" that groups one or more `Generation` records. A design is created automatically when a generation is started without a valid `designId`.

### Schema

```typescript
interface Design {
  id: ObjectId;          // MongoDB unique ID
  userId: ObjectId;      // Owner's user ID
  firstPrompt: string;   // The prompt that originally created this design
  createdAt: Date;
  updatedAt: Date;
}
```

### Database

**Collection**: `designs`

**Indexes**:
- `userId`
- `(userId, createdAt)` (compound)

**Sample Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439020"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "firstPrompt": "Modern minimalist living room",
  "createdAt": ISODate("2026-05-19T10:30:00.000Z"),
  "updatedAt": ISODate("2026-05-19T10:30:00.000Z")
}
```

### Lifecycle

1. **Creation**: First `POST /api/generations` call (no `designId`, or unknown/foreign `designId`) creates a new design with `firstPrompt` set to that prompt.
2. **Reuse**: Subsequent generations can pass `designId` to attach to the same design.
3. **Ownership**: Designs are user-scoped — a `designId` that doesn't belong to the caller is treated as missing, and a new design is created instead.

---

## Generation

Represents a single image generation request and its result. Always belongs to a `Design`.

### Schema

```typescript
interface Generation {
  id: ObjectId;                          // MongoDB unique ID
  userId: ObjectId;                      // Owner's user ID
  designId: ObjectId;                    // Parent design ID
  originalPrompt: string;                // User's original text input
  finalPrompt: string;                   // AI-enhanced prompt
  imageUrl?: string;                     // Public URL to generated image
  imageFilename?: string;                // Filename in storage
  status: 'pending' | 'processing' | 'success' | 'failed';
  errorMessage?: string;                 // Error details if failed
  style?: 'minimalist' | 'modern' | 'industrial' | 'japandi';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  createdAt: Date;                       // Generation request timestamp
  updatedAt: Date;                       // Last status update
}
```

### Database

**Collection**: `generations`

**Indexes**:
- `userId` (indexed)
- `designId` (indexed)
- `status` (indexed)
- `(userId, createdAt)` (compound, for efficient user queries)

**Sample Document** (Success):
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "designId": ObjectId("507f1f77bcf86cd799439020"),
  "originalPrompt": "Modern minimalist living room",
  "finalPrompt": "Modern minimalist living room with natural light and contemporary furniture",
  "imageUrl": "http://localhost:3000/api/images/550e8400-e29b-41d4-a716-446655440000.jpg",
  "imageFilename": "550e8400-e29b-41d4-a716-446655440000.jpg",
  "status": "success",
  "style": "minimalist",
  "aspectRatio": "16:9",
  "createdAt": ISODate("2024-05-18T10:30:00.000Z"),
  "updatedAt": ISODate("2024-05-18T10:32:15.000Z")
}
```

**Sample Document** (Processing):
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "designId": ObjectId("507f1f77bcf86cd799439020"),
  "originalPrompt": "Industrial kitchen with exposed brick",
  "finalPrompt": "Industrial kitchen with exposed brick",
  "status": "processing",
  "style": "industrial",
  "aspectRatio": "4:3",
  "createdAt": ISODate("2024-05-18T11:00:00.000Z"),
  "updatedAt": ISODate("2024-05-18T11:00:05.000Z")
}
```

**Sample Document** (Failed):
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439014"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "designId": ObjectId("507f1f77bcf86cd799439020"),
  "originalPrompt": "Invalid prompt",
  "finalPrompt": "Invalid prompt",
  "status": "failed",
  "errorMessage": "API rate limit exceeded, please try again later",
  "createdAt": ISODate("2024-05-18T12:00:00.000Z"),
  "updatedAt": ISODate("2024-05-18T12:00:35.000Z")
}
```

### Fields Explained

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✅ | MongoDB unique ID |
| `userId` | ObjectId | ✅ | Owner user ID (links to User) |
| `designId` | ObjectId | ✅ | Parent design ID (links to Design) |
| `originalPrompt` | string | ✅ | User's input text |
| `finalPrompt` | string | ✅ | Prompt after AI enhancement |
| `imageUrl` | string | ❌ | Public URL to image (null until ready) |
| `imageFilename` | string | ❌ | Storage filename (null until ready) |
| `status` | string | ✅ | Current state |
| `errorMessage` | string | ❌ | Error details (only if failed) |
| `style` | string | ❌ | Design style chosen |
| `aspectRatio` | string | ❌ | Image aspect ratio |
| `createdAt` | Date | ✅ | Request timestamp |
| `updatedAt` | Date | ✅ | Last update timestamp |

### Status Values

| Status | Description | Duration | imageUrl |
|--------|-------------|----------|----------|
| `pending` | Queued, not started | < 1 sec | null |
| `processing` | Job running, generating | 10-30 sec | null |
| `success` | Complete, image ready | - | URL |
| `failed` | Error occurred, stopped | - | null |

### API Response

```json
{
  "id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "designId": "507f1f77bcf86cd799439020",
  "originalPrompt": "Modern minimalist living room",
  "finalPrompt": "Modern minimalist living room with natural light and contemporary furniture",
  "imageUrl": "http://localhost:3000/api/images/550e8400-e29b-41d4-a716-446655440000.jpg",
  "status": "success",
  "style": "minimalist",
  "aspectRatio": "16:9",
  "createdAt": "2024-05-18T10:30:00.000Z",
  "updatedAt": "2024-05-18T10:32:15.000Z"
}
```

### Lifecycle

```
POST /api/generations
    ↓
Generation created (status: pending)
    ↓
Job queued in BullMQ
    ↓
Worker picks up job
    ↓
status: processing
    ↓
Enhance prompt, generate image
    ↓
Save image to disk
    ↓
status: success, set imageUrl
    (or)
    ↓
status: failed, set errorMessage
    ↓
DELETE /api/generations/:id
    ↓
Generation and image deleted
```

### Query Examples

**Get user's generations**:
```javascript
db.generations.find({ userId: ObjectId("...") }).sort({ createdAt: -1 })
```

**Get pending/processing**:
```javascript
db.generations.find({ status: { $in: ["pending", "processing"] } })
```

**Get failed generations**:
```javascript
db.generations.find({ status: "failed" })
```

**Count user's generations**:
```javascript
db.generations.countDocuments({ userId: ObjectId("...") })
```

---

## Enums

### Design Styles

```typescript
type DesignStyle = 'minimalist' | 'modern' | 'industrial' | 'japandi';
```

| Style | Description | Use Case |
|-------|-------------|----------|
| `minimalist` | Clean, simple, uncluttered | Modern apartments |
| `modern` | Contemporary with sleek lines | Offices, homes |
| `industrial` | Raw materials, exposed elements | Lofts, studios |
| `japandi` | Japanese + Scandinavian blend | Bedroom, living areas |

### Aspect Ratios

```typescript
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3';
```

| Ratio | Dimensions | Use Case |
|-------|-----------|----------|
| `1:1` | Square | Social media, profiles |
| `16:9` | Widescreen | Desktop, presentations |
| `9:16` | Vertical | Mobile, stories |
| `4:3` | Standard | Prints, classic displays |

### Generation Status

```typescript
type GenerationStatus = 'pending' | 'processing' | 'success' | 'failed';
```

---

## Relationships

```
User
  ↓ 1:N
  Design (userId references User._id)
    ↓ 1:N
    Generation (designId references Design._id, userId references User._id)
```

**Cardinality**:
- 1 User → many Designs
- 1 Design → many Generations
- 1 Generation → 1 Design, 1 User

**Referential Integrity**:
- No automatic cascade on user/design delete (keeps historical data)
- Orphaned generations remain accessible to admin
- A `designId` that does not belong to the caller is treated as missing on `POST /api/generations` (a new design is created)

---

## Storage Locations

### Database

**MongoDB**:
- Collections: `users`, `designs`, `generations`
- Connection: `MONGODB_URI` (default: localhost:27017)
- Database: `roomvision-ai`

### Filesystem

**Images**:
- Location: `./uploads/images/`
- Format: JPEG
- Naming: UUID (e.g., `550e8400-e29b-41d4-a716-446655440000.jpg`)

### Cache

**Redis**:
- Job queue: `bull:image-generation:*`
- Connection: `REDIS_URL` (default: localhost:6379)

---

## Type Definitions

```typescript
// shared/types/index.ts

export type GenerationStatus = 'pending' | 'processing' | 'success' | 'failed';
export type DesignStyle = 'minimalist' | 'modern' | 'industrial' | 'japandi';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3';

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Design {
  id: string;
  userId: string;
  firstPrompt: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Generation {
  id: string;
  userId: string;
  designId: string;
  originalPrompt: string;
  finalPrompt: string;
  imageUrl: string;
  imageFilename?: string;
  status: GenerationStatus;
  errorMessage?: string;
  style?: DesignStyle;
  aspectRatio?: AspectRatio;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface GenerationJob {
  generationId: string;
  designId: string;
  userId: string;
  originalPrompt: string;
  style?: DesignStyle;
  aspectRatio?: AspectRatio;
}
```

---

## Data Validation

### User
- `googleId`: Required, unique
- `email`: Required, unique, valid email format
- `name`: Required, string
- `picture`: Optional, valid URL

### Generation
- `userId`: Required, valid ObjectId
- `originalPrompt`: Required, non-empty string (max 1000 chars)
- `finalPrompt`: Required, string
- `status`: Required, one of enum values
- `style`: Optional, one of enum values
- `aspectRatio`: Optional, one of enum values
- `imageUrl`: Optional, valid URL
- `imageFilename`: Optional, alphanumeric + dash/underscore
- `errorMessage`: Optional, string

---

## Constraints

### Unique Constraints
- `User.googleId` (unique)
- `User.email` (unique)

### Foreign Keys
- `Generation.userId` → `User._id`

### Field Constraints
- `originalPrompt` max length: 1000 characters
- `finalPrompt` max length: 2000 characters
- `errorMessage` max length: 500 characters

---

## Migrations (Future)

No migrations needed yet. Plan ahead for:

1. **Adding user fields** (phone, address)
2. **Adding generation metadata** (model used, seed, latency)
3. **Analytics fields** (views, likes, shares)
4. **Versioning** (generation v1, v2, etc.)
5. **Collections** (user-created folders for designs)

### Migration Pattern
```javascript
db.users.updateMany({}, { $set: { newField: defaultValue } })
```
