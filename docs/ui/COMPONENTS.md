# Component Library

## UI Components

### Button

Basic button component with multiple variants and sizes.

**Variants:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
**Sizes:** `default`, `sm`, `lg`, `icon`

```tsx
import { Button } from '@/components/ui/button'

// Default button
<Button>Generate Design</Button>

// With icon
<Button>
  <Sparkles className="w-4 h-4 mr-2" />
  Generate
</Button>

// Variants
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// Loading state
<Button disabled>
  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  Loading...
</Button>
```

### Input

Text input field for single-line text entry.

```tsx
import { Input } from '@/components/ui/input'

<Input 
  placeholder="Enter text..." 
  value={value}
  onChange={(e) => setValue(e.target.value)}
  disabled={isLoading}
/>
```

### Textarea

Multi-line text input, perfect for prompts.

```tsx
import { Textarea } from '@/components/ui/textarea'

<Textarea 
  placeholder="Describe your design..."
  value={prompt}
  onChange={(e) => setPrompt(e.target.value)}
  className="min-h-[120px]"
  disabled={isLoading}
/>
```

### Card

Container component for content organization.

**Sub-components:**
- `Card` - Main container
- `CardHeader` - Header section
- `CardTitle` - Title in header
- `CardDescription` - Subtitle/description
- `CardContent` - Main content area
- `CardFooter` - Footer with actions

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Generate Design</CardTitle>
    <CardDescription>Create your ideal space</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    <Button>Submit</Button>
  </CardFooter>
</Card>
```

### Badge

Status or tag indicator.

**Variants:** `default`, `secondary`, `destructive`, `outline`, `success`, `processing`

```tsx
import { Badge } from '@/components/ui/badge'

// Status badges
<Badge variant="success">Success</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="processing">Processing</Badge>

// Style/tag badges
<Badge variant="outline">Japandi</Badge>
<Badge>Premium</Badge>
```

### Skeleton

Loading placeholder component.

```tsx
import { Skeleton } from '@/components/ui/skeleton'

// Loading image placeholder
<div className="relative aspect-square">
  <Skeleton className="w-full h-full" />
</div>

// Loading text
<Skeleton className="h-4 w-3/4" />
<Skeleton className="h-4 w-1/2 mt-2" />
```

## Composite Components

### PromptForm

Main form for entering design prompts.

**Props:**
- `onGenerate` (callback) - Called with prompt text when submitted
- `isLoading` (boolean) - Show loading state

**Features:**
- Textarea for prompt input
- Quick example buttons
- Character counter
- Loading state with spinner
- Disabled when empty or loading

```tsx
import { PromptForm } from '@/components/prompt-form'

<PromptForm 
  onGenerate={(prompt) => console.log(prompt)}
  isLoading={isLoading}
/>
```

### ImageCard

Display a single generated design.

**Props:**
- `generation` (Generation) - Design data object
- `showActions` (boolean) - Show regenerate/download buttons

**Features:**
- Image preview with lazy loading
- Status badge
- Style indicator
- Date display
- Error message display
- Action buttons

```tsx
import { ImageCard } from '@/components/image-card'

<ImageCard 
  generation={designObject}
  showActions={true}
/>
```

### GalleryGrid

Responsive grid of ImageCards.

**Props:**
- `generations` (Generation[]) - Array of designs
- `emptyMessage` (string) - Message when no designs

**Features:**
- Responsive 1-3 column layout
- Empty state with icon
- Hover effects

```tsx
import { GalleryGrid } from '@/components/gallery-grid'

<GalleryGrid 
  generations={designs}
  emptyMessage="No designs yet!"
/>
```

### Header

Navigation header with logo and links.

**Features:**
- Branding with icon
- Navigation links
- Active page highlighting
- Sticky positioning
- Responsive

```tsx
import { Header } from '@/components/header'

// Used in root layout
<Header />
```

## Type Definitions

### Generation

```tsx
interface Generation {
  id: string;
  originalPrompt: string;      // User's initial prompt
  finalPrompt: string;         // Final prompt sent to AI
  imageUrl: string;            // URL to generated image
  imagePath?: string;          // Server-side path
  status: GenerationStatus;    // 'pending' | 'processing' | 'success' | 'failed'
  errorMessage?: string;       // Error details if failed
  createdAt: Date;
  updatedAt: Date;
  style?: 'minimalist' | 'modern' | 'industrial' | 'japandi';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
}
```

### User

```tsx
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

## Utility Functions

### cn() - Class Name Merger

Combine Tailwind CSS classes with conditional logic.

```tsx
import { cn } from '@/lib/utils'

// Basic usage
const buttonClass = cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500'
)

// Multiple conditions
const cardClass = cn(
  'rounded-lg border p-4',
  variant === 'elevated' && 'shadow-lg',
  disabled && 'opacity-50'
)
```

## Layout Patterns

### Full-Width Container

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### Two-Column Layout

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2">
    {/* Main content */}
  </div>
  <div>
    {/* Sidebar */}
  </div>
</div>
```

### Responsive Grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Items */}
</div>
```

## Color System

### CSS Variables

All colors are available as CSS variables:

```css
--background    /* Page background */
--foreground    /* Text color */
--card          /* Card backgrounds */
--primary       /* Primary button color */
--accent        /* Highlight color */
--border        /* Border color */
--muted         /* Disabled/secondary color */
--destructive   /* Error/delete color */
```

### Tailwind Classes

Use standard Tailwind classes:

```tsx
// Background colors
<div className="bg-background bg-card bg-accent">

// Text colors
<p className="text-foreground text-muted-foreground">

// Border colors
<div className="border border-border">

// Ring colors (focus states)
<button className="focus:ring-ring">
```

## Responsive Breakpoints

```
sm  640px    tablets
md  768px    small laptops
lg  1024px   laptops
xl  1280px   large screens
2xl 1536px   ultra-wide
```

## Common Patterns

### Form Submit

```tsx
const [prompt, setPrompt] = useState('')
const [isLoading, setIsLoading] = useState(false)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  
  try {
    // API call
    await generateDesign(prompt)
  } finally {
    setIsLoading(false)
  }
}

<form onSubmit={handleSubmit}>
  <Textarea 
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    disabled={isLoading}
  />
  <Button disabled={!prompt.trim() || isLoading}>
    {isLoading ? 'Generating...' : 'Generate'}
  </Button>
</form>
```

### Search with Filter

```tsx
const [search, setSearch] = useState('')

const filtered = items.filter(item =>
  item.name.toLowerCase().includes(search.toLowerCase())
)

<Input
  placeholder="Search..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>
{filtered.map(item => <Item key={item.id} {...item} />)}
```

### Loading Skeleton

```tsx
import { Skeleton } from '@/components/ui/skeleton'

{isLoading ? (
  <div className="space-y-4">
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
) : (
  <Content />
)}
```

## Creating New Components

1. **Create the file** in `components/`
2. **Add 'use client'** if it's interactive
3. **Import dependencies** from ui components
4. **Type your props** with TypeScript
5. **Use cn()** for conditional classes
6. **Export component** as default

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MyComponentProps {
  variant?: 'default' | 'outline'
  disabled?: boolean
  children: React.ReactNode
}

export function MyComponent({
  variant = 'default',
  disabled = false,
  children
}: MyComponentProps) {
  return (
    <div className={cn(
      'p-4 rounded-lg',
      variant === 'default' && 'bg-primary',
      variant === 'outline' && 'border',
      disabled && 'opacity-50'
    )}>
      {children}
    </div>
  )
}
```

## Browser Support

All components are tested and compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
