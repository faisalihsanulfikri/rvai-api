# RoomVision AI - Design Documentation

## Design Overview

RoomVision AI is a modern, clean interior design generator with a focus on usability and visual appeal. The design follows modern web standards with a minimalist aesthetic inspired by contemporary design apps.

## Design System

### Color Palette

**Light Mode (Default):**
- Background: White (#FFFFFF)
- Foreground: Nearly Black (#0A0A0A)
- Primary: Dark (#090909)
- Accent: Orange-Yellow (#FFB84D) - Used for highlights and CTAs
- Border: Light Gray (#E5E5E5)
- Muted: Light Gray (#F2F2F2)

**Dark Mode:**
- Background: Near-Black (#0A0A0A)
- Foreground: Near-White (#F7F7F7)
- Border: Dark Gray (#262626)

### Typography

- **Headings**: 
  - H1: 36px (2.25rem) - Bold, for page titles
  - H2: 24px (1.5rem) - Bold, for section titles
  - Body: 14px-16px (0.875rem-1rem) - Regular, for content

- **Font Stack**: System fonts (sans-serif) for optimal performance

### Spacing

- Base unit: 4px (0.25rem)
- Common spacing: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px

### Border Radius

- Large: 8px (lg)
- Medium: 6px (md)
- Small: 4px (sm)

## Component Architecture

### Layout Structure

```
<RootLayout>
  <Header /> (Navigation)
  <main>
    <Page Content>
  </main>
  <Footer>
</RootLayout>
```

### Component Hierarchy

#### UI Components (Primitive)
- Button - Versatile button with variants
- Input - Single-line text input
- Textarea - Multi-line text input
- Card - Container with optional header/footer
- Badge - Status/tag indicator
- Skeleton - Loading placeholder

#### Composite Components
- **PromptForm** - Combines textarea, button, and examples
- **ImageCard** - Combines image, badge, and actions
- **GalleryGrid** - Grid layout of ImageCards
- **Header** - Navigation with links and branding

#### Page Components
- **Home (/)** - Hero + Form + Features + Recent designs
- **Gallery (/gallery)** - List with search/filter + stats
- **Detail (/gallery/[id])** - Full image + regenerate form

## Page Layouts

### Home Page (/)
- **Hero Section**: Title, description, value proposition
- **Generation Form**: Main interaction point
- **Features Section**: 3-column grid of benefits
- **Recent Designs**: Preview of latest generations

**Responsive Behavior:**
- Mobile: Single column layout, stacked sections
- Tablet: 2-column grid for features
- Desktop: Full-width optimized layout

### Gallery Page (/gallery)
- **Header**: Title + stats
- **Filters**: Search bar, sort buttons
- **Grid**: Responsive 1-3 column grid
- **Statistics**: 4-column summary stats

**Responsive Behavior:**
- Mobile: 1 column grid, stacked stats
- Tablet: 2 column grid
- Desktop: 3 column grid, horizontal stats

### Detail Page (/gallery/[id])
- **Image Preview**: Large, centered image
- **Sidebar**: Metadata and details
- **Regenerate Form**: Full-width form below

**Responsive Behavior:**
- Mobile: Stacked layout (image, sidebar, form)
- Desktop: 2-column layout with image + sidebar

## Interactive States

### Buttons
- **Default**: Solid background, dark text
- **Hover**: Slightly darker background
- **Active**: Darker shade
- **Disabled**: Reduced opacity, no cursor
- **Loading**: Shows spinner, disabled state

### Inputs
- **Focus**: 2px ring outline
- **Disabled**: Reduced opacity
- **Error**: Red border (not implemented in prototype)

### Cards
- **Default**: Light shadow, subtle border
- **Hover**: Slightly elevated shadow
- **Active**: No change (for container components)

## Loading States

### Image Generation Loading
- Skeleton placeholder in image area
- Loading spinner in button
- Disabled input fields
- Message: "Generating..."

### Page Navigation
- Instant transitions using Next.js
- No loading bars for routing

## Accessibility

- **Semantic HTML**: Uses proper heading hierarchy
- **Color Contrast**: WCAG AA compliant
- **Keyboard Navigation**: Full tab support
- **Focus States**: Visible focus rings on interactive elements
- **Images**: Alt text for generated images
- **Links**: Descriptive link text

## Mobile-First Approach

Design starts with mobile constraints, then enhances for larger screens:
- Single column layouts by default
- Touch-friendly button sizes (44px minimum)
- Larger text for readability
- Simplified navigation

## Design Tokens (CSS Variables)

```css
--background: Page background color
--foreground: Text color
--card: Card background
--primary: Primary button color
--accent: Highlight color (#FFB84D)
--border: Border color
--muted: Muted/disabled color
--muted-foreground: Muted text
```

## Image Display

- **Aspect Ratio**: 1:1 (square) for grid
- **Loading**: Skeleton while fetching
- **Error**: Icon + message overlay
- **Optimization**: Next.js Image component with lazy loading

## Interaction Patterns

### Form Submission
1. User enters prompt
2. Clicks "Generate Design"
3. Button shows loading spinner
4. Form becomes disabled
5. After generation: Form resets, new image appears

### Regeneration
1. User navigates to design detail
2. Modifies prompt in textarea
3. Clicks "Regenerate"
4. Shows loading skeleton
5. Replaces image with new generation

### Gallery Filtering
1. Type in search bar (real-time)
2. Results filter instantly
3. Can sort results
4. Counts update dynamically

## Typography Hierarchy

```
H1 (2.25rem) - Page titles
  ↓
H2 (1.5rem) - Section titles
  ↓
H3 (1.125rem) - Subsection titles (CardTitle)
  ↓
Body (1rem) - Regular text
  ↓
Small (0.875rem) - Secondary text
  ↓
Xs (0.75rem) - Metadata, captions
```

## Animation & Motion

- **Transitions**: 150-300ms for state changes
- **Loading**: Pulse animation for skeletons
- **Hover**: Smooth background/shadow transitions
- **No Motion**: Respects `prefers-reduced-motion` via Tailwind

## Future Design Enhancements

- [ ] Toast notifications for actions
- [ ] Modal dialogs for confirmations
- [ ] Sidebar navigation (if adding more features)
- [ ] Progress indicators for multi-step flows
- [ ] Carousel for image comparisons
- [ ] Advanced filters (by date, style, etc.)
- [ ] Custom color scheme selector
- [ ] Onboarding/tutorial overlay

## Design Files Reference

The reference image at `/docs/reference/main-app.png` shows a chat interface which inspired the clean, list-based layout approach with focus on the main content area.

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

All styles use modern CSS with Tailwind, no IE11 support needed.
