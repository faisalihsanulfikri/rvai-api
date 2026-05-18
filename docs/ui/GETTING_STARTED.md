# Getting Started Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

### 3. Open in Browser

- **Home Page**: http://localhost:3000
- **Gallery**: http://localhost:3000/gallery
- **Design Detail**: http://localhost:3000/gallery/gen-1

## Project Tour

### 🏠 Home Page (/)
- **What you'll see**: Hero section with prompt input form
- **Try this**: 
  - Type a design prompt (e.g., "Modern living room with plants")
  - Click "Generate Design"
  - See simulated generation state

### 🎨 Gallery Page (/gallery)
- **What you'll see**: All generated designs in a grid
- **Features to explore**:
  - Search by design name/prompt
  - Sort by recent or oldest
  - View statistics
  - Click any design to see full details

### 📸 Design Detail Page (/gallery/gen-1)
- **What you'll see**: Large image with full details
- **Features to explore**:
  - View original vs final prompt
  - See metadata (style, date)
  - Edit prompt and regenerate
  - Download or share

## File Structure Quick Reference

```
src/
├── app/                 # Pages
│   ├── page.tsx        # Home
│   ├── gallery/
│   │   ├── page.tsx   # Gallery list
│   │   └── [id]/      # Single design
├── components/          # Reusable components
├── lib/                # Utilities & dummy data
└── types/              # TypeScript types
```

## Key Features (Prototype)

✅ **Implemented:**
- Responsive layout (mobile, tablet, desktop)
- Prompt input with suggestions
- Image gallery with search/sort
- Design detail view
- Regenerate form
- Loading states
- Dark mode support (via CSS variables)

❌ **Not Yet Connected:**
- Backend API calls
- Real image generation
- User authentication
- Database storage

## Available Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Component Examples

### Using Button
```tsx
import { Button } from '@/components/ui/button'

<Button variant="default" size="lg">
  Click me
</Button>
```

### Using Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

### Using Form Components
```tsx
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

<Input placeholder="Your text" />
<Textarea placeholder="Multi-line text" />
```

## Dummy Data

All data is mocked in `lib/dummy-data.ts`:
- 6 example designs with real Unsplash images
- User profile information
- Various styles and statuses

To modify dummy data:
1. Edit `lib/dummy-data.ts`
2. Changes take effect immediately on dev server

## Styling Guide

### Adding Custom Styles
Use Tailwind CSS classes:
```tsx
<div className="flex items-center gap-4 p-6 bg-card rounded-lg">
  Content
</div>
```

### Using Colors
CSS variables are available:
```css
.custom {
  background-color: var(--background);
  color: var(--foreground);
  border-color: var(--border);
}
```

### Dark Mode
Automatically switches based on system preference:
```tsx
// Dark mode is applied with `dark` class on html element
// All colors are already dark-mode aware
```

## Next Steps for Development

### 1. Connect Backend
- Set up Node.js API server
- Implement API endpoints in `api/generations`
- Replace fetch calls with real API

### 2. Add Authentication
- Implement user login/signup
- Store user ID in session
- Filter gallery by user

### 3. Setup Database
- Store generations in database
- Implement image storage (S3 or local)
- Add user management

### 4. AI Integration
- Connect to Pollinations.ai or Gemini API
- Stream image generation status
- Handle errors and retries

### 5. Deployment
- Build for production: `npm run build`
- Deploy to Vercel, Netlify, or your server
- Setup environment variables
- Configure CI/CD pipeline

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Dependencies Not Installed
```bash
rm -rf node_modules package-lock.json
npm install
```

### Changes Not Reflecting
- Next.js hot reload should work automatically
- If not, restart dev server: `Ctrl+C` then `npm run dev`

### Build Errors
```bash
npm run lint    # Check for errors
npm run build   # Try building
```

## Useful Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **TypeScript**: https://www.typescriptlang.org/docs
- **Lucide Icons**: https://lucide.dev

## Questions?

See `README.md` for more details or `DESIGN_NOTES.md` for design decisions.
