# RoomVision AI - Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2024-05-18

### ✨ Added

- **Image Editing Modal** - New modal dialog for editing and regenerating designs
  - Shows reference image as payload
  - Pre-filled with current prompt
  - Allows tweaking before regeneration
  - Auto-closes after submission
  
- **Keyboard Shortcuts**
  - `Enter` to submit prompt
  - `Shift + Enter` for new line in prompt
  
- **Real-Time Generation Feedback**
  - Prompts appear immediately upon submission
  - Skeleton loading with shimmer animation
  - Smooth transition from skeleton to final image
  
- **Image Hover Actions**
  - Download button (top-right, icon-only)
  - Edit button (bottom-center, with text)
  - Semi-transparent overlay on hover
  - One-click image download as PNG
  
- **Chat-Like Message Layout**
  - User prompts positioned on the right with accent background
  - Generated images positioned on the left
  - Natural conversation flow
  
- **Improved Input Form**
  - Full-width textarea for better visibility
  - "Create Image" button with Sparkles icon
  - Character counter and disclaimer text
  - Plus and Microphone control icons
  - Cleaner, more professional design
  
- **Custom Shimmer Loading Animation**
  - Replaces default pulse animation
  - Smooth light sweep effect
  - Better visual feedback for loading states

### 🔧 Changed

- **Aspect Ratio:** Changed from 4:3 to 16:9 for all generated images
  - Better widescreen format for interior design visualization
  - More standard modern display ratio
  
- **Button Heights:** Reduced from 100px to 80px for better viewport fit

- **Page Layout:** Changed main container from `h-screen` to `h-full`
  - Fixes button overflow issues
  - Ensures content fits properly on all screen sizes
  - Prevents layout breaking on smaller viewports
  
- **Message Component:** Restructured to support new layout pattern
  - Prompt container with background styling
  - Image display with proper aspect ratio
  - Hover state management for action buttons

### 🐛 Fixed

- Generate button appearing outside viewport
- Character counter positioning in form
- Image aspect ratio calculation
- Keyboard event handling for Shift+Enter

### 📝 Documentation

- Added comprehensive update documentation: `RECENT_UPDATES.md`
- Updated documentation index with new features
- Added this changelog file

### 🎨 UI/UX Improvements

- Better visual hierarchy with new message layout
- Improved loading feedback with shimmer animation
- Intuitive image interaction patterns
- Modern, polished button styling with hover effects
- Professional form design

---

## [0.1.0] - 2024-05-18 (Initial Release)

### ✨ Added

- Core chat-based design generation interface
- Prompt submission and image generation
- Thread history in sidebar
- Multiple design generation in single thread
- Image display with proper sizing
- Design badges for styles and aspect ratios
- Responsive layout (mobile, tablet, desktop)
- Dark mode support with CSS variables
- Component library (Button, Input, Card, Badge, Skeleton, Textarea)
- TypeScript type safety
- ESLint configuration
- Dummy data for prototyping

### 🏗️ Architecture

- Next.js 14 with App Router
- TypeScript strict mode
- Tailwind CSS for styling
- shadcn/ui component patterns
- React hooks for state management
- Image optimization with Next.js Image component

### 📚 Documentation

- README with project overview
- Getting Started guide
- Design notes with color system
- Component library documentation
- Quick reference guide
- Project overview and architecture

---

## Roadmap

### Next Priority (v0.3.0)

- [ ] Backend API integration
  - Replace dummy data with real generation
  - Connect to Pollinations.ai or Gemini API
  - Implement proper error handling
  
- [ ] Design Persistence
  - User authentication
  - Database integration
  - Save/load designs
  - Gallery view
  
- [ ] Advanced Features
  - Style presets selector
  - Multiple aspect ratio options
  - Design comparison view
  - Prompt templates library
  
- [ ] Quality Improvements
  - More comprehensive error handling
  - Toast notifications
  - Loading states refinement
  - Animations between states

### Future Ideas (v0.4.0+)

- Mobile app (React Native)
- Design collaboration features
- Batch generation
- Export to PDF/PPT
- Browser extension
- API for third parties

---

**Maintained by:** Claude Code  
**Last Updated:** 2024-05-18
