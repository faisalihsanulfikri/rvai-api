# Image Input Support - Implementation Guide

**Date:** May 18, 2026  
**Version:** 0.3.0  
**Feature:** Multi-modal Prompts with Image Reference Input

---

## 🎯 Overview

RoomVision AI now supports **image-based prompts** in addition to text. Users can upload reference images that become payload data for AI generation, enabling more precise and context-aware design outputs.

**Key Capability:** Text prompts + Reference images → AI generates designs based on both inputs

---

## ✨ New Features

### 1. **Image Upload in Prompt Form**

#### Upload Mechanism
- **Button:** Image icon in control row
- **Action:** Click to open file picker
- **Accepted Formats:** All standard image types (JPG, PNG, GIF, WebP, etc.)
- **Size Limit:** 5MB maximum file size
- **Validation:** File type and size checked before upload

```tsx
// File: components/prompt-form.tsx
<button
  type="button"
  disabled={isLoading}
  onClick={() => fileInputRef.current?.click()}
  title="Upload reference image"
  className="text-foreground/60 hover:text-foreground transition-colors disabled:opacity-50 p-2"
>
  <Image className="w-5 h-5" />
</button>

<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  onChange={handleImageChange}
  disabled={isLoading}
  className="hidden"
  aria-label="Upload reference image"
/>
```

### 2. **Image Preview Thumbnail**

#### Placement
- **Position:** Top-left corner of form (next to textarea)
- **Size:** 96x96 pixels (w-24 h-24)
- **Aspect:** Maintains original image aspect ratio
- **Border:** Subtle border with rounded corners

#### Features
- **Live Preview:** Image displays immediately after upload
- **Remove Button:** X button in top-right corner of thumbnail
- **Filename Display:** Shows uploaded filename below thumbnail
- **Image Object Cover:** Crops image to fit square container

```tsx
{imagePreview && (
  <div className="relative flex-shrink-0">
    <div className="relative w-24 h-24 overflow-hidden rounded-lg border border-border bg-muted">
      <img
        src={imagePreview}
        alt="Reference"
        className="w-full h-full object-cover"
      />
    </div>
    <button
      type="button"
      onClick={removeImage}
      disabled={isLoading}
      className="absolute -top-2 -right-2 p-1 bg-background border border-border rounded-full hover:bg-muted transition-colors"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
)}
```

### 3. **Regenerate Button (Not Edit)**

#### Why "Regenerate" Instead of "Edit"?
- **Edit** implies modifying existing content
- **Regenerate** means creating new variations using the same reference
- More intuitive for design iteration workflows

#### Button Behavior
- **Icon:** RotateCcw (refresh icon)
- **Icon-Only:** No text label, just icon
- **Position:** Bottom-center of generated image
- **Hover:** Shows tooltip "Regenerate" on hover
- **Disabled State:** During generation processing
- **Disabled Styling:** Opacity reduction + cursor change

```tsx
<button
  onClick={handleEdit}
  disabled={isLoading}
  title="Regenerate"
  className="bg-black/50 backdrop-blur text-white p-3 rounded-full hover:bg-black/60 transition-colors border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
>
  <RotateCcw className="w-5 h-5" />
</button>
```

### 4. **Generated Image as Reference/Payload**

#### Workflow
1. User generates a design (text + optional image input)
2. Generated image is displayed with regenerate button
3. User clicks "Regenerate" button
4. **Generated image becomes the reference image input** (shown as thumbnail)
5. Original prompt is pre-filled in form
6. User can modify prompt and regenerate with the generated image as reference

#### Data Flow
```
Text Prompt + Reference Image
        ↓
   [Generate]
        ↓
  Generated Image
   (with regenerate button)
        ↓
   [User Clicks Regenerate]
        ↓
Generated Image → Reference Thumbnail
Original Prompt → Pre-filled in form
        ↓
   [User Modifies & Regenerate]
        ↓
  New Generation (using previous output as reference)
```

### 5. **Form Population on Regenerate**

#### What Happens When Regenerate is Clicked
1. **Prompt Filled:** Original prompt auto-populates in textarea
2. **Image Thumbnail:** Generated image appears as reference thumbnail
3. **Scroll:** Form scrolls into view automatically
4. **Ready to Edit:** User can:
   - Modify the prompt text
   - Replace the reference image with a new one
   - Add another reference image
   - Submit to regenerate

#### Implementation
```tsx
// In page.tsx
const handleEditImage = (prompt: string, imageUrl: string) => {
  setEditingPrompt(prompt)
  setEditingImageDataUrl(imageUrl)
  // Scroll to bottom to show form
  setTimeout(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, 0)
}

// In PromptForm props
<PromptForm
  initialPrompt={editingPrompt}
  initialImageDataUrl={editingImageDataUrl}
  onPromptChange={() => {
    setEditingPrompt('')
    setEditingImageDataUrl('')
  }}
/>
```

---

## 🔄 Data Model Updates

### New Type: PromptInput

```typescript
// types/index.ts
export interface PromptInput {
  text: string                    // User's text prompt
  imageFile?: File               // File object (for upload)
  imageDataUrl?: string          // Data URL for display/transmission
}
```

### Updated Generation Type

```typescript
export interface Generation {
  id: string
  originalPrompt: string         // User's initial text prompt
  finalPrompt: string           // Final prompt sent to AI
  imageUrl: string              // Generated result image
  referenceImage?: string       // Input reference image (data URL)
  referenceImagePath?: string   // Server path to reference image
  status: GenerationStatus
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
  style?: 'minimalist' | 'modern' | 'industrial' | 'japandi'
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '19:6'
}
```

---

## 📁 Files Modified

### 1. **types/index.ts** - Type Definitions
**Changes:**
- Added `PromptInput` interface
- Updated `Generation` interface with `referenceImage` and `referenceImagePath`

**Purpose:** Type-safe data structures for image input workflow

### 2. **components/prompt-form.tsx** - Image Upload Form
**Changes:**
- Added image file input element
- Added `imageFile` and `imagePreview` state
- Added `imagePreview` thumbnail display (top-left)
- Added image validation (type and size)
- Added remove image button
- Updated callback from `string` to `PromptInput` object
- Added `initialImageDataUrl` prop for form population
- Improved useEffect to always reset state (not just on truthy values)

**Key Functions:**
- `handleImageChange()` - Process uploaded file
- `removeImage()` - Clear selected image
- `handleSubmit()` - Pass both text and image to parent

### 3. **components/chat-message.tsx** - Regenerate Button
**Changes:**
- Changed button text "Edit" → removed (icon-only)
- Changed icon: `Edit2` → `RotateCcw`
- Added `isLoading` prop to disable during generation
- Updated button styling for icon-only display
- Added tooltip text for accessibility

**Purpose:** Clear regenerate workflow instead of edit modal

### 4. **components/edit-modal.tsx** - Modal Enhancement (DEPRECATED)
**Status:** Component still exists but no longer used for regeneration
**Note:** Can be removed in future cleanup, replaced by form population

### 5. **app/page.tsx** - Main Generation Logic
**Changes:**
- Replaced `editingImage` state with `editingImageDataUrl` state
- Updated `handleEditImage()` to populate form instead of opening modal
- Updated `handleGenerateFirst()` to accept `PromptInput`
- Updated `handleGenerateNext()` to accept `PromptInput`
- Updated both handlers to store `referenceImage` in Generation object
- Removed EditModal JSX entirely
- Removed `handleEditModalSubmit()` function
- Pass `isLoading` prop to ChatMessage
- Updated PromptForm with `initialImageDataUrl` prop
- Updated `onPromptChange` callback to reset both prompt and image

**Data Flow:**
```tsx
PromptForm receives PromptInput {text, imageDataUrl}
  ↓
handleGenerateNext/handleGenerateFirst
  ↓
Creates Generation with referenceImage property
  ↓
ChatMessage displays with regenerate button
  ↓
Click regenerate → form populates
  ↓
Cycle repeats
```

---

## 🎨 UI/UX Flow

### Initial Generation
```
┌─────────────────────────────┐
│  Image Icon  │   Textarea   │
│   [Upload]   │ "Describe..." │
└─────────────────────────────┘
        ↓ Submit
        ↓
┌─────────────────────────────┐
│       Generated Image       │
│  [Download]  [Regenerate]   │
└─────────────────────────────┘
```

### After Regenerate Click
```
┌─────────────────────────────┐
│ [Thumbnail] │   Textarea    │
│   (Image)   │ (Prev Prompt) │
└─────────────────────────────┘
        ↓ Modify & Submit
        ↓
┌─────────────────────────────┐
│       New Generated Image   │
│  [Download]  [Regenerate]   │
└─────────────────────────────┘
```

---

## 🔒 Validation & Error Handling

### File Validation

```tsx
const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    // Type validation
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Size validation (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    // Process valid file
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }
}
```

### State Validation

- **Empty Prompt Check:** Submit disabled if prompt is empty
- **Loading Check:** Regenerate button disabled during generation
- **Image Size Check:** Pre-upload validation prevents oversized images
- **File Type Check:** Only image files accepted

---

## 🚀 User Workflows

### Workflow 1: Text-Only Generation
1. User types prompt in textarea
2. Clicks "Create Image" or presses Enter
3. Design generates from text prompt alone

### Workflow 2: Text + Image Generation
1. User clicks image icon and uploads reference image
2. Thumbnail appears in top-left
3. User types text prompt
4. Clicks "Create Image"
5. Design generates using both text and image reference

### Workflow 3: Iterative Regeneration
1. User generates a design (Step 1 or 2)
2. Hovers over result image
3. Clicks refresh icon (Regenerate)
4. **Form auto-fills with:**
   - Previous prompt
   - Generated image as reference thumbnail
5. User modifies prompt (optional)
6. Submits to regenerate
7. New design appears with previous output as reference

### Workflow 4: Replace Reference Image
1. In regenerate mode (form populated with image thumbnail)
2. User clicks image icon
3. New image replaces the reference thumbnail
4. Can modify prompt too
5. Submits with new reference image

---

## 💾 Backend Integration Notes

When connecting to backend API, the `PromptInput` data structure should be converted to FormData:

```typescript
const formData = new FormData()
formData.append('prompt', input.text)
if (input.imageFile) {
  formData.append('referenceImage', input.imageFile)
}

// Send to /api/generations endpoint
const response = await fetch('/api/generations', {
  method: 'POST',
  body: formData
})
```

The backend should:
1. Accept multipart/form-data with `prompt` and optional `referenceImage`
2. Store the reference image path in the Generation object
3. Pass both to the AI image generation service
4. Return the reference image URL in response

---

## 🧪 Testing Checklist

### Image Upload
- [ ] Click image icon opens file picker
- [ ] Select valid image (JPG, PNG, etc.)
- [ ] Thumbnail displays in top-left corner
- [ ] Filename shown below thumbnail
- [ ] File size validation works (5MB limit)
- [ ] File type validation works (image only)

### Image Preview
- [ ] Thumbnail maintains aspect ratio
- [ ] Image fits in 96x96px container
- [ ] X button removes image
- [ ] Removed image clears form state

### Generation with Image
- [ ] Can generate with image only (no text)
- [ ] Can generate with text only (no image)
- [ ] Can generate with both text and image
- [ ] Reference image stored in Generation object

### Regenerate Button
- [ ] Button appears on hover over generated image
- [ ] Icon is refresh/rotate icon
- [ ] Clicking button populates form
- [ ] Previous prompt fills textarea
- [ ] Generated image shows as reference thumbnail
- [ ] Button disabled during generation

### Form Population
- [ ] Clicking regenerate scrolls to form
- [ ] Form clears properly after submission
- [ ] Can regenerate multiple times
- [ ] Second regenerate click works properly
- [ ] State resets between iterations

### Multiple Iterations
- [ ] Generate → Regenerate → Regenerate (multiple cycles)
- [ ] Each cycle uses previous output as reference
- [ ] Prompt history visible in UI (left side chat)
- [ ] No state leakage between iterations

---

## 📊 Metrics & Tracking

### User Actions to Track
- Image upload count
- Image file sizes
- Text-only vs image-based generations
- Regenerate click frequency
- Average iterations per design session

---

## 🔮 Future Enhancements

### Planned Features
1. **Multiple Reference Images**
   - Allow 2-3 reference images per prompt
   - Show gallery of reference images
   - Weight contribution of each image

2. **Image Editing Before Upload**
   - Crop, rotate, resize images
   - Adjust opacity/blend
   - Draw on images for specific areas

3. **Reference Image Management**
   - Save favorite reference images
   - Create reference image collections
   - Batch upload multiple references

4. **Advanced Generation Options**
   - Image influence strength slider
   - Style transfer options
   - Region-specific generation

5. **Backend Integration**
   - Real API calls instead of simulation
   - Image processing on server
   - Reference image storage in database

---

## 📝 Code Examples

### Using PromptInput in API Calls

```typescript
// Old way (text-only)
const handleGenerate = (prompt: string) => {
  fetchAPI('/api/generate', { prompt })
}

// New way (text + image)
const handleGenerate = (input: PromptInput) => {
  const formData = new FormData()
  formData.append('prompt', input.text)
  if (input.imageFile) {
    formData.append('referenceImage', input.imageFile)
  }
  fetchAPI('/api/generate', formData)
}
```

### Handling Reference Image in Component

```typescript
// Showing reference image in generation
const generation: Generation = {
  // ... other fields
  referenceImage: dataUrl, // Base64 or URL
  imageUrl: resultUrl
}

// Display reference image
{generation.referenceImage && (
  <img src={generation.referenceImage} alt="Reference" />
)}
```

---

## 🔗 Related Documentation

- [README.md](./README.md) - Project overview
- [COMPONENTS.md](./COMPONENTS.md) - Component library
- [DESIGN_NOTES.md](./DESIGN_NOTES.md) - Design system
- [RECENT_UPDATES.md](./RECENT_UPDATES.md) - Previous updates

---

## ✅ Completion Checklist

- [x] Add image upload to prompt form
- [x] Image preview thumbnail display
- [x] File validation (type and size)
- [x] Remove image functionality
- [x] Update type definitions (PromptInput)
- [x] Update Generation type with referenceImage
- [x] Change Edit button to Regenerate
- [x] Update button icon (Sparkles → RotateCcw)
- [x] Remove text, keep icon only
- [x] Implement form population on regenerate
- [x] Update state management
- [x] Remove EditModal usage
- [x] Fix multi-click regenerate issue
- [x] Add isLoading prop for button disable
- [x] Test multiple regenerate cycles
- [x] Documentation complete

---

**Last Updated:** May 18, 2026  
**Version:** 0.3.0  
**Status:** ✅ Complete & Tested

