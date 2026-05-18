# Image Endpoints

Base path: `/api/images`

---

## Serve Image

Get a generated image file.

```
GET /api/images/:filename
```

**Authentication**: ❌ Not required

**Parameters**:
- `filename` (string, required) - Image filename (UUID.jpg format)

**Response** (200 OK):
Binary image data (JPEG)

**Headers**:
```
Content-Type: image/jpeg
```

**Status Codes**:
- `200` - Image found
- `400` - Invalid filename (security check)
- `404` - Image not found
- `500` - Server error

**Filename Validation**:
- Only alphanumeric, dash, underscore allowed
- Extension must be: `.jpg`, `.jpeg`, `.png`, or `.webp`
- Format: `{uuid}.{ext}`

**Example URL**:
```
http://localhost:3001/api/images/550e8400-e29b-41d4-a716-446655440000.jpg
```

**Example Request**:
```bash
curl -X GET http://localhost:3001/api/images/550e8400-e29b-41d4-a716-446655440000.jpg \
  -o image.jpg
```

**JavaScript - Display in Image Tag**:
```html
<img src="http://localhost:3001/api/images/550e8400-e29b-41d4-a716-446655440000.jpg" 
     alt="Generated design" 
     width="100%">
```

**JavaScript - Download**:
```typescript
const filename = '550e8400-e29b-41d4-a716-446655440000.jpg';
const url = `http://localhost:3001/api/images/${filename}`;

fetch(url)
  .then(r => r.blob())
  .then(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  });
```

---

## Image Storage

### Location
```
./uploads/images/
```

### Filename Format
```
{uuid}.jpg
Example: 550e8400-e29b-41d4-a716-446655440000.jpg
```

### File Properties
- **Format**: JPEG
- **Size**: Varies (typically 1-3 MB)
- **Generation Time**: ~15-30 seconds
- **Retention**: Kept as long as generation record exists

---

## Image Lifecycle

### 1. Generation Created
```
POST /api/generations
→ Generation record created (status: pending)
→ Job queued in BullMQ
→ No image yet (imageUrl: null)
```

### 2. Image Generated
```
BullMQ Worker starts processing
→ Calls AI APIs
→ Receives image buffer
→ Saves to ./uploads/images/{uuid}.jpg
→ Updates Generation.imageFilename = {uuid}.jpg
→ Updates Generation.imageUrl = http://localhost:3000/api/images/{uuid}.jpg
→ Updates Generation.status = success
```

### 3. Image Available
```
GET /api/generations/:id
→ Returns imageUrl: "http://localhost:3000/api/images/{uuid}.jpg"
→ Frontend displays in gallery
→ User can view at http://localhost:3001/api/images/{uuid}.jpg
```

### 4. Image Deleted
```
DELETE /api/generations/:id
→ Generation.imageFilename is deleted from disk
→ Generation record is deleted from database
→ Image no longer accessible at /api/images/:filename
```

---

## Image Specifications

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

### Size Limits
- Typical: 1-3 MB per image
- Maximum: No hard limit (filesystem space dependent)

### Resolution
- Depends on Pollinations.ai model
- Typically 512x512 to 1024x1024

### Quality
- JPEG quality: Good (Pollinations.ai default)
- Lossless: PNG available if using different generation API

---

## Error Responses

### Invalid Filename (400)
```json
{
  "error": "Invalid filename"
}
```

**Causes**:
- Filename contains invalid characters
- File extension not allowed (not .jpg/.jpeg/.png/.webp)
- Path traversal attempt (e.g., `../../../etc/passwd`)

**Solution**: Use valid UUID-based filename

### Image Not Found (404)
```json
{
  "error": "Image not found"
}
```

**Causes**:
- Image file deleted
- Wrong filename
- Generation deleted

**Solution**: Check generation status, regenerate if needed

### Server Error (500)
```json
{
  "error": "Image not found"
}
```

**Causes**:
- Filesystem error
- Permission denied
- Disk full

**Solution**: Check server logs, contact support

---

## Image URLs

### Storage Path
```
Backend: ./uploads/images/{uuid}.jpg
```

### Public URL
```
Frontend: http://localhost:3000/api/images/{uuid}.jpg
```

**URL Construction**:
```typescript
const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const imageUrl = `${baseUrl}/api/images/${filename}`;
```

**In Database**:
```json
{
  "imageFilename": "550e8400-e29b-41d4-a716-446655440000.jpg",
  "imageUrl": "http://localhost:3000/api/images/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

---

## Security

### Filename Validation
```typescript
// Only alphanumeric, dash, underscore allowed
if (!/^[a-zA-Z0-9\-_.]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
  return res.status(400).json({ error: 'Invalid filename' });
}
```

### Path Traversal Prevention
Filenames with path separators (/ or \) are rejected:
- ❌ `../../../etc/passwd.jpg`
- ❌ `..\\..\\windows\\system32.jpg`
- ✅ `550e8400-e29b-41d4-a716-446655440000.jpg`

### CORS
Images are served with CORS headers allowing cross-origin access (for embedding in other domains)

---

## Optimization

### Caching
Images are static files - use browser caching:
```
Cache-Control: max-age=31536000, immutable
```

**Implementation** (in production):
```typescript
res.set('Cache-Control', 'max-age=31536000, immutable');
```

### CDN Integration
For production, serve images via CDN:
1. Upload to S3 / Google Cloud Storage
2. Set image URL to CDN URL
3. Remove local filesystem serving

### Compression
Images are already compressed (JPEG):
- Gzip not beneficial for JPEG
- Use WebP format for better compression

---

## Storage Considerations

### Filesystem
```
./uploads/images/       # 1000s of JPEGs (GBs of data)
```

**Issues**:
- No replication/backup
- Limited by disk space
- Difficult to scale across servers

### Production Solutions

**Option 1: AWS S3**
```typescript
// Upload during generation
const s3 = new AWS.S3();
await s3.putObject({
  Bucket: 'roomvision-ai',
  Key: filename,
  Body: imageBuffer,
  ContentType: 'image/jpeg'
});

// Serve from S3 URL
const imageUrl = `https://s3.amazonaws.com/roomvision-ai/${filename}`;
```

**Option 2: Google Cloud Storage**
```typescript
const storage = new Storage();
const bucket = storage.bucket('roomvision-ai');
await bucket.file(filename).save(imageBuffer);

const imageUrl = `https://storage.googleapis.com/roomvision-ai/${filename}`;
```

**Option 3: Cloudinary**
```typescript
const cloudinary = require('cloudinary').v2;
const result = await cloudinary.uploader.upload_stream(
  { public_id: filename },
  (error, result) => result
).end(imageBuffer);

const imageUrl = result.secure_url;
```

---

## Download Images

### Browser
```html
<a href="http://localhost:3001/api/images/550e8400-e29b-41d4-a716-446655440000.jpg" 
   download="design.jpg">
  Download
</a>
```

### JavaScript (Programmatic)
```typescript
async function downloadImage(filename) {
  const url = `http://localhost:3001/api/images/${filename}`;
  const response = await fetch(url);
  const blob = await response.blob();
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Usage
downloadImage('550e8400-e29b-41d4-a716-446655440000.jpg');
```

### curl
```bash
curl -o design.jpg \
  http://localhost:3001/api/images/550e8400-e29b-41d4-a716-446655440000.jpg
```

---

## Gallery Integration

### Display Image in Gallery
```typescript
{generations.map(gen => (
  <div key={gen.id}>
    {gen.status === 'success' && (
      <img 
        src={gen.imageUrl} 
        alt={gen.originalPrompt}
        width="300"
        height="200"
      />
    )}
    {gen.status === 'processing' && (
      <div>Generating...</div>
    )}
    {gen.status === 'failed' && (
      <div>Error: {gen.errorMessage}</div>
    )}
  </div>
))}
```

### Lazy Loading
```html
<img 
  src={imageUrl}
  loading="lazy"
  alt={prompt}
/>
```

### Responsive Images
```html
<picture>
  <source 
    media="(max-width: 640px)" 
    srcSet={imageUrl + '?w=300'}
  />
  <source 
    media="(max-width: 1024px)" 
    srcSet={imageUrl + '?w=500'}
  />
  <img 
    src={imageUrl}
    alt={prompt}
  />
</picture>
```

---

## Future Features

- [ ] Image compression/optimization
- [ ] Multiple formats (PNG, WebP)
- [ ] Thumbnail generation
- [ ] Image editing (crop, filter)
- [ ] Export to PNG/PDF
- [ ] Cloud storage integration
- [ ] CDN distribution
- [ ] Image variations (upscale, downscale)
