# RoomVision AI - Interior Design Generator

A modern web application that generates stunning interior and architecture designs using AI. Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

✨ **Core Features:**
- Generate custom interior design images from text prompts
- Save and organize designs in a personal gallery
- Re-generate designs by editing previous prompts
- Real-time generation status updates
- Persistent gallery with search and filtering
- Responsive design for mobile, tablet, and desktop

🎨 **Design Styles:**
- Minimalist
- Modern
- Industrial
- Japandi

⚡ **Technical Highlights:**
- Built with Next.js App Router for optimal performance
- Type-safe with TypeScript
- Beautiful UI components from shadcn/ui
- Tailwind CSS for responsive styling
- Optimized image loading with Next.js Image component

## Project Structure

```
roomvision-ai/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with header
│   ├── page.tsx           # Home page (generation)
│   ├── gallery/
│   │   ├── page.tsx       # Gallery with search/filter
│   │   └── [id]/
│   │       └── page.tsx   # Single design detail & regenerate
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── badge.tsx
│   │   └── skeleton.tsx
│   ├── header.tsx         # Navigation header
│   ├── prompt-form.tsx    # Generation form
│   ├── image-card.tsx     # Individual design card
│   └── gallery-grid.tsx   # Grid layout for designs
├── lib/
│   ├── utils.ts           # Utility functions (cn)
│   └── dummy-data.ts      # Mock data for prototyping
├── types/
│   └── index.ts           # TypeScript type definitions
├── public/                # Static assets
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd roomvision-ai

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

### Build for Production

```bash
npm run build
npm run start
```

## Pages

### `/` - Home Page
- Hero section with app description
- Prompt input form with examples
- Feature highlights
- Recent designs preview

### `/gallery` - Gallery Page
- Display all saved designs
- Search functionality
- Sort by recent or oldest
- Gallery statistics
- Quick stats dashboard

### `/gallery/[id]` - Design Detail Page
- Full-size image display
- Original and final prompt
- Design metadata
- Regenerate form to create variations
- Download and share options

## API Integration (Coming Soon)

The app is currently using dummy data for prototyping. Connect these endpoints:

```
POST   /api/generations           - Create new design
GET    /api/generations           - Get all user designs
GET    /api/generations/:id       - Get specific design
POST   /api/generations/:id/regenerate - Regenerate design
```

### Data Model

```typescript
interface Generation {
  id: string;
  originalPrompt: string;
  finalPrompt: string;
  imageUrl: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  style?: 'minimalist' | 'modern' | 'industrial' | 'japandi';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
}
```

## UI Components

All UI components are self-contained and reusable:
- **Button**: Various variants (default, outline, ghost, destructive)
- **Card**: Container component with header, title, description, content
- **Input**: Text input with focus states
- **Textarea**: Multi-line input for prompts
- **Badge**: Status and style indicators
- **Skeleton**: Loading placeholder

## Styling

- **Colors**: Customizable via CSS variables
- **Dark Mode**: Built-in dark mode support with `dark` class
- **Responsive**: Mobile-first design
- **Animations**: Smooth transitions and loading states

## Development Tips

### Adding New Pages
1. Create a new file in `app/` directory
2. Use the existing layout automatically
3. Import components from `components/`

### Adding New Components
1. Create in `components/` directory
2. Use `'use client'` for interactive components
3. Import UI components from `components/ui/`

### Styling Components
- Use Tailwind CSS classes
- Use `cn()` utility for conditional classes
- Follow the existing color scheme from CSS variables

## Future Enhancements

- [ ] Backend API integration (Node.js)
- [ ] User authentication
- [ ] Image download/export
- [ ] Prompt templates library
- [ ] Style/aspect ratio selector
- [ ] Design sharing
- [ ] Comments and notes on designs
- [ ] Favorites/starred designs
- [ ] Batch generation
- [ ] Design history/versions

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## Performance Optimizations

- Image optimization with Next.js Image component
- CSS-in-JS with Tailwind (no runtime overhead)
- Server-side rendering with App Router
- Automatic code splitting
- Font optimization

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Support

For issues or suggestions, please create a GitHub issue or contact the development team.

---

**Note:** This is a frontend prototype using dummy data. Backend integration with Node.js and AI API (Pollinations.ai or Gemini) is required for production deployment.
