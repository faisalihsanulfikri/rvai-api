# RoomVision AI - Project Overview

## 🎯 Project Summary

**RoomVision AI** is a modern web application for generating interior and architecture designs using AI. Users can describe their ideal space, generate stunning visualizations, save designs to a persistent gallery, and iterate by regenerating with modified prompts.

**Status**: Frontend prototype complete with dummy data
**Next Phase**: Backend API + AI integration

## 📊 Project Structure

```
roomvision-ai/
├── 📄 README.md                      # Main documentation
├── 📄 GETTING_STARTED.md             # Quick start guide
├── 📄 DESIGN_NOTES.md                # Design system & decisions
├── 📄 COMPONENTS.md                  # Component library reference
├── 📄 PROJECT_OVERVIEW.md            # This file
│
├── app/                              # Next.js App Router
│   ├── page.tsx                      # Home page (/)
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Global styles
│   └── gallery/
│       ├── page.tsx                  # Gallery list (/gallery)
│       └── [id]/
│           └── page.tsx              # Design detail (/gallery/[id])
│
├── components/                       # React components
│   ├── ui/                          # Reusable UI primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── badge.tsx
│   │   └── skeleton.tsx
│   ├── header.tsx                   # Navigation header
│   ├── prompt-form.tsx              # Design prompt input
│   ├── image-card.tsx               # Single design card
│   └── gallery-grid.tsx             # Grid of designs
│
├── lib/                              # Utilities & data
│   ├── utils.ts                     # Helper functions (cn)
│   └── dummy-data.ts                # Mock data for prototyping
│
├── types/
│   └── index.ts                     # TypeScript interfaces
│
├── public/                           # Static assets
│
└── Configuration Files
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .eslintrc.json
    └── .gitignore
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser to http://localhost:3000
```

**Explore the app:**
- **Home**: http://localhost:3000
- **Gallery**: http://localhost:3000/gallery  
- **Design Detail**: http://localhost:3000/gallery/gen-1

## 💡 Key Features

### ✅ Implemented (Prototype)
- [x] Responsive design (mobile, tablet, desktop)
- [x] Home page with generation form
- [x] Gallery with search and filtering
- [x] Design detail page with regenerate form
- [x] Loading states and error handling
- [x] Dummy data with realistic images
- [x] Modern UI with Tailwind CSS
- [x] TypeScript for type safety
- [x] Dark mode support
- [x] Accessible component library

### ⏳ Coming Soon (Backend)
- [ ] Node.js API server
- [ ] AI image generation (Pollinations.ai or Gemini)
- [ ] Database integration
- [ ] User authentication
- [ ] Image storage (S3 or local)
- [ ] Real API endpoints
- [ ] Error handling and retries
- [ ] Rate limiting and quotas

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Icons**: Lucide React
- **Image Optimization**: Next.js Image

**Backend (To Be Built):**
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL/MongoDB
- **Image Storage**: AWS S3 or Cloudinary
- **AI APIs**: Pollinations.ai or Google Gemini

### Data Flow

```
User Input
    ↓
PromptForm Component
    ↓
API Call to /api/generations
    ↓
Backend Processes Request
    ↓
AI API Generates Image
    ↓
Backend Stores Image + Metadata
    ↓
Response with Generated Image
    ↓
Update Gallery Display
    ↓
User Sees Result
```

## 📄 File Guide

### Documentation Files
- **README.md** - Main documentation, features, setup
- **GETTING_STARTED.md** - Quick start and project tour
- **DESIGN_NOTES.md** - Design system, colors, typography
- **COMPONENTS.md** - Component library with examples
- **PROJECT_OVERVIEW.md** - This file

### Source Code
- **app/layout.tsx** - Root layout wrapper
- **app/page.tsx** - Home page with form
- **app/gallery/page.tsx** - Gallery list view
- **app/gallery/[id]/page.tsx** - Single design detail
- **components/prompt-form.tsx** - Main input form
- **components/image-card.tsx** - Design card display
- **components/gallery-grid.tsx** - Grid layout
- **lib/dummy-data.ts** - Mock data (6 designs)

### Configuration
- **package.json** - Dependencies and scripts
- **tsconfig.json** - TypeScript configuration
- **next.config.js** - Next.js settings
- **tailwind.config.js** - Tailwind customization
- **postcss.config.js** - CSS processing

## 🎨 Design System

### Color Palette
- **Primary**: Dark (#090909)
- **Accent**: Orange-Yellow (#FFB84D) - highlights
- **Background**: White (light) / Near-black (dark)
- **Border**: Light gray (#E5E5E5)
- **Muted**: Reduced contrast for disabled states

### Typography
- **H1**: 36px, bold for titles
- **H2**: 24px, bold for sections
- **Body**: 14-16px, regular for content
- **Small**: 12px for metadata

### Spacing
- Base unit: 4px
- Common: 4, 8, 12, 16, 20, 24, 32, 40px
- Responsive padding: 4-8px (mobile), 6-8px (tablet), 8px+ (desktop)

### Components
- **Button**: 5 variants, 4 sizes
- **Card**: Container with header/footer
- **Input/Textarea**: Form inputs
- **Badge**: Status indicators
- **Skeleton**: Loading placeholders

## 📱 Responsive Design

### Mobile First
- Start with single column
- Touch-friendly sizes (44px minimum)
- Simplified navigation
- Larger text for readability

### Breakpoints
- `sm`: 640px (tablets)
- `md`: 768px (small laptops)
- `lg`: 1024px (laptops)
- `xl`: 1280px (large screens)

### Page Layouts

**Home Page:**
- Mobile: Stacked sections
- Tablet: 2-column feature grid
- Desktop: Full-width optimized

**Gallery Page:**
- Mobile: 1 column grid
- Tablet: 2 column grid
- Desktop: 3 column grid + stats

**Detail Page:**
- Mobile: Stacked (image, sidebar, form)
- Desktop: 2-column (image + sidebar)

## 🔌 API Endpoints (To Implement)

```
POST   /api/generations              Generate new design
GET    /api/generations              List user's designs
GET    /api/generations/:id          Get specific design
POST   /api/generations/:id/regenerate  Create variation
DELETE /api/generations/:id          Delete design
```

### Request/Response Format

**Generate Request:**
```json
{
  "prompt": "Modern living room with plants",
  "style": "minimalist",
  "aspectRatio": "4:3"
}
```

**Generate Response:**
```json
{
  "id": "gen-123",
  "status": "processing",
  "originalPrompt": "...",
  "finalPrompt": "...",
  "createdAt": "2024-05-18T10:30:00Z"
}
```

## 🔄 User Workflows

### Generate a Design
1. User navigates to home page
2. Enters design prompt (or picks example)
3. Clicks "Generate Design"
4. Sees loading skeleton (10-30 seconds)
5. Image appears with success badge
6. Design is automatically saved

### Browse Gallery
1. User goes to /gallery
2. Sees all designs in grid
3. Can search by prompt
4. Can sort by date
5. Clicks design to view details

### Regenerate Design
1. User views design details
2. Modifies the prompt
3. Clicks "Regenerate"
4. New image replaces old one
5. Original still available in history

## 📊 Data Model

### Generation Object
```typescript
{
  id: string                    // Unique ID
  originalPrompt: string        // User's input
  finalPrompt: string          // AI-enhanced prompt
  imageUrl: string             // Generated image URL
  status: 'pending' | 'processing' | 'success' | 'failed'
  errorMessage?: string        // Error details
  style: 'minimalist' | 'modern' | 'industrial' | 'japandi'
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3'
  createdAt: Date
  updatedAt: Date
}
```

### User Object
```typescript
{
  id: string                   // Unique user ID
  email: string               // User email
  name: string                // Display name
  createdAt: Date
}
```

## 🧪 Testing the Prototype

### Manual Testing Checklist

**Home Page:**
- [ ] Form inputs are editable
- [ ] Example prompts can be clicked
- [ ] Generate button works
- [ ] Loading state shows properly
- [ ] Recent designs display below form

**Gallery Page:**
- [ ] All designs load correctly
- [ ] Search filters results in real-time
- [ ] Sort buttons toggle between recent/oldest
- [ ] Statistics display correctly
- [ ] Responsive grid adapts to screen size

**Detail Page:**
- [ ] Image displays at full size
- [ ] Metadata shows correctly
- [ ] Regenerate form is functional
- [ ] Back button returns to gallery
- [ ] All links work properly

**Responsive Design:**
- [ ] Mobile view: single column, stacked
- [ ] Tablet view: 2 columns, adjusted spacing
- [ ] Desktop view: full-width, multi-column
- [ ] Touch targets are at least 44px
- [ ] Text is readable at all sizes

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Recommended Platforms
- **Vercel** (recommended for Next.js)
- **Netlify** (with adapters)
- **AWS** (EC2, Lambda, etc.)
- **DigitalOcean** (App Platform)
- **Self-hosted** (VPS with Node.js)

### Environment Variables
```
NEXT_PUBLIC_API_URL=https://api.example.com
AI_API_KEY=your_key_here
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## 📈 Performance Considerations

- **Image Optimization**: Next.js Image component with lazy loading
- **Code Splitting**: Automatic route-based splitting
- **CSS**: Tailwind purges unused classes
- **Caching**: Browser caching for static assets
- **API**: Implement pagination for gallery

## 🔒 Security Notes

- Sanitize all user inputs
- Validate prompts before sending to AI API
- Implement rate limiting on backend
- Use HTTPS for all connections
- Store sensitive keys in environment variables
- Validate image uploads

## 📚 Resources

- **Next.js**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Lucide Icons**: https://lucide.dev
- **TypeScript**: https://www.typescriptlang.org
- **React**: https://react.dev

## 🤝 Contributing

1. Create a new branch for features
2. Follow the existing code style
3. Use TypeScript for type safety
4. Test on mobile devices
5. Update documentation as needed

## 📝 License

MIT License - Free for personal and commercial use.

## ✅ Checklist for Next Phase

- [ ] Set up Node.js backend
- [ ] Create Express API with endpoints
- [ ] Integrate AI image generation API
- [ ] Set up database (PostgreSQL/MongoDB)
- [ ] Implement user authentication
- [ ] Add image storage (S3/Cloudinary)
- [ ] Connect frontend to real API
- [ ] Test end-to-end workflow
- [ ] Set up error logging
- [ ] Deploy to production
- [ ] Set up monitoring/analytics
- [ ] Create admin dashboard

---

**Last Updated**: 2024-05-18
**Version**: 0.1.0 (Frontend Prototype)
**Status**: 🟡 In Progress (Backend pending)
