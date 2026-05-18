# Quick Reference Card

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Build for production
npm run start        # Run production build
npm run lint         # Check for linting errors
```

## File Locations

| What | Where |
|------|-------|
| Pages | `app/` |
| Components | `components/` |
| Types | `types/index.ts` |
| Mock Data | `lib/dummy-data.ts` |
| Utilities | `lib/utils.ts` |
| Global Styles | `app/globals.css` |
| Config | Root directory |

## Component Imports

```tsx
// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// Composite Components
import { PromptForm } from '@/components/prompt-form'
import { ImageCard } from '@/components/image-card'
import { GalleryGrid } from '@/components/gallery-grid'
import { Header } from '@/components/header'

// Types
import { Generation, User } from '@/types'

// Utilities
import { cn } from '@/lib/utils'
import { dummyGenerations } from '@/lib/dummy-data'

// Next.js
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// Icons
import { Sparkles, Loader2, Download, AlertCircle } from 'lucide-react'
```

## Common Patterns

### Button Loading State
```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Loading...
    </>
  ) : (
    <>
      <Sparkles className="w-4 h-4 mr-2" />
      Generate
    </>
  )}
</Button>
```

### Form State
```tsx
const [value, setValue] = useState('')
const [isLoading, setIsLoading] = useState(false)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  try {
    // Do something
  } finally {
    setIsLoading(false)
  }
}
```

### Conditional Styles
```tsx
<div className={cn(
  'base-class',
  condition && 'conditional-class',
  condition2 ? 'class-a' : 'class-b'
)}>
```

### Link to Page
```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

<Link href="/gallery">
  <Button>View Gallery</Button>
</Link>
```

### Navigate Programmatically
```tsx
'use client'
import { useRouter } from 'next/navigation'

const router = useRouter()
router.push('/gallery')
```

### Get Route Params
```tsx
'use client'
import { useParams } from 'next/navigation'

const params = useParams()
const id = params.id // Access URL param [id]
```

## Tailwind Classes

### Common Utilities
```tsx
// Spacing
className="p-4 m-2 gap-4"      // padding, margin, gap

// Flexbox
className="flex items-center justify-between"

// Grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"

// Colors
className="bg-primary text-foreground border border-border"

// Size
className="w-full h-screen max-w-7xl"

// Rounded
className="rounded-lg rounded-full"

// Shadow
className="shadow-sm shadow-lg"

// Hover/Active
className="hover:bg-accent focus:ring-2 focus:ring-ring"

// Responsive
className="text-base sm:text-lg md:text-xl"

// Responsive Display
className="hidden sm:block"      // Hidden on mobile
className="block sm:hidden"      // Visible on mobile only
```

### Responsive Prefixes
```
sm:    640px+
md:    768px+
lg:    1024px+
xl:    1280px+
2xl:   1536px+
```

## Page Routing

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `app/page.tsx` | Home/Generator |
| `/gallery` | `app/gallery/page.tsx` | Gallery list |
| `/gallery/[id]` | `app/gallery/[id]/page.tsx` | Design detail |

## Badge Variants

```tsx
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Tag</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="processing">Loading</Badge>
```

## Button Variants

```tsx
<Button variant="default">Primary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="link">Link</Button>

<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

## Icons (Lucide React)

```tsx
import {
  Sparkles,      // Star/magic
  Loader2,       // Loading spinner
  Download,      // Download arrow
  AlertCircle,   // Warning/error
  Zap,          // Lightning bolt
  Search,        // Magnifying glass
  SortDesc,      // Sort arrow
  ArrowLeft,     // Back arrow
} from 'lucide-react'

<Sparkles className="w-4 h-4" />  // Icon size
```

## Data Dummy Usage

```tsx
import { dummyGenerations, dummyUser } from '@/lib/dummy-data'

// 6 example designs
dummyGenerations.forEach(design => {
  console.log(design.finalPrompt)
})

// User info
console.log(dummyUser.name)  // "Alex Chen"
```

## Types Reference

```tsx
// Generation status
type GenerationStatus = 'pending' | 'processing' | 'success' | 'failed'

// Styles available
type Style = 'minimalist' | 'modern' | 'industrial' | 'japandi'

// Image aspect ratios
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3'
```

## CSS Variables

```css
--background         Page background color
--foreground         Text color
--card              Card background
--primary           Primary button
--accent            Highlight color (#FFB84D)
--border            Border color
--muted             Disabled color
--muted-foreground  Muted text
--destructive       Error/delete color
```

Use in code:
```tsx
<div style={{ color: 'var(--accent)' }}>
  Colored text
</div>
```

## Environment Setup

### .env.local (create locally, don't commit)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
API_SECRET_KEY=your_secret_here
```

### .env.example (commit this template)
```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SITE_URL=
API_SECRET_KEY=
```

## Debugging Tips

### Check Component Props
```tsx
console.log({ props, state })  // Log before render
```

### Inspect Elements
```bash
# In browser DevTools
Elements tab → Find element → Computed styles
```

### Check Responsive Design
```bash
# Browser DevTools → Toggle Device Toolbar (Ctrl+Shift+M)
```

### Verify Tailwind Classes
```bash
# Open Elements → Styles tab → Find Tailwind classes
# Ensure className string is valid
```

## Common Mistakes

❌ Forgetting `'use client'` on interactive components
✅ Add at top of file: `'use client'`

❌ Directly modifying state
✅ Use setState hook: `setState(newValue)`

❌ Missing dependencies in useEffect
✅ Add all dependencies to array: `useEffect(..., [dep1, dep2])`

❌ Using className conditionally wrong
✅ Use cn() helper: `cn('base', condition && 'conditional')`

❌ Forgetting Link wrapper for navigation
✅ Always wrap buttons in Link: `<Link href="/page"><Button>Go</Button></Link>`

## Performance Tips

- Use Next.js Image component (lazy loading)
- Add loading skeletons for better UX
- Memoize heavy components if needed
- Use dynamic imports for large libraries
- Optimize images before uploading

## Git Workflow

```bash
git init                    # Initialize repo
git add .                   # Stage all files
git commit -m "Init"        # Commit changes
git branch feature/name     # Create feature branch
git checkout feature/name   # Switch branch
git push origin feature/name # Push to remote
```

## Useful Links

- **Docs**: README.md, GETTING_STARTED.md, DESIGN_NOTES.md
- **Components**: COMPONENTS.md (with examples)
- **Project**: PROJECT_OVERVIEW.md

---

**Print this out or bookmark for quick reference!**
