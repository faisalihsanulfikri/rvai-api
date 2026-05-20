# RoomVision AI - Documentation Index

Welcome to the RoomVision AI documentation! Start here to find the right guide for your needs.

---

## 📢 Latest Updates

**Just updated!** Check out the recent improvements:

0. **[LANDING_PAGE.md](./LANDING_PAGE.md)** - LATEST (v0.7.0) 🏡
   - New public landing page at `/` (hero, "Our Work Procedure", "Who We Are", showcase, final CTA, footer) — warm beige palette inspired by the reference mockup
   - Generate app moved from `/` → `/generate`; middleware now allows `/` without auth
   - Header gained a "Home" link; "Sign in" button now routes to `/login` instead of jumping straight into OAuth
   - Login success and already-logged-in redirects updated to `/generate`
   - Stats bar: **4** Design styles · **6** Room types · **30s** Avg generation · **∞** Iterations
   - Known follow-up: `design-setup.tsx` only exposes 3 room chips today (data model has 6)

0. **[SESSION_SUMMARY_2026_05_20.md](./SESSION_SUMMARY_2026_05_20.md)** - (v0.6.1) 🧩
   - Gallery → Generate regenerate now pre-fills the image, Room chip, Style chip, and notes (formResetKey remount fix)
   - `room` plumbed end-to-end: `Generation.room`, `generations.create/regenerate` payloads, optimistic records, regenerate links, API docs
   - Frontend stopped composing prompts — sends raw notes only; backend now owns the `{style}-style {room}. …` template
   - Room slugs switched to hyphenated form (`living-room`, `home-office`, `dining-room`)
   - Room + Style badges under the image in both chat messages and gallery cards
   - Generic error copy ("We hit a technical issue…") replaces raw API JSON in three render sites
   - Design switching refetches generations on cache miss; no more stranding on the "Set up your design" wizard
   - Favicon (`app/icon.svg`) now matches the navbar Sparkles logo

0. **[NICHE_DESIGN_SETUP.md](./NICHE_DESIGN_SETUP.md)** - (v0.6.0) 🏠
   - New structured **Design Setup** empty state — photo dropzone + room/style chips
   - `PromptInput` now carries `roomType`, `style`, `mode` end-to-end
   - First-generation prompt composed from structured fields (no more hardcoded `'japandi'`)
   - Chat preview no longer forced to 16:9 — renders at the image's natural aspect ratio
   - Caveat: "preserve layout" is still prompt-only; real img2img/segmentation is the next backend step

0. **[CHAT_REFERENCE_LOADING_FIXES.md](./CHAT_REFERENCE_LOADING_FIXES.md)** - (v0.5.5) 💬
   - Chat bubble shows `originalPrompt` (raw user text) instead of `finalPrompt`
   - New Copy icon button under each prompt bubble
   - `stringToFile` helper sends the reference image on the regenerate flow too (remote URL → fetched → `File` part)
   - Prompt form is only disabled when the *currently visible* design has an in-flight generation — switching to a fresh design re-enables it

0. **[SIDEBAR_FORM_REGENERATE_UPDATES.md](./SIDEBAR_FORM_REGENERATE_UPDATES.md)** - (v0.5.4) ✨
   - Sidebar design titles truncate to a single line
   - "All chats" collapse/expand toggle for the design list
   - Prompt form auto-clears when switching to a different design (or "+ New Design")
   - `POST /api/generations` now uploads the reference image as `multipart/form-data`
   - Regenerate buttons (chat overlay, gallery card, gallery detail) now use `originalPrompt`, not `finalPrompt`

0. **[DESIGNS_SIDEBAR_UPDATE.md](./DESIGNS_SIDEBAR_UPDATE.md)** - (v0.5.3) 🗂️
   - Sidebar now lists designs from `GET /api/designs` (labeled by `firstPrompt`)
   - Generations grouped by `designId` for fast thread switching
   - Follow-up prompts attach to the current design via `generations.create(..., designId)`
   - Logout button now force-redirects to `/login`

0. **[AUTH_AND_API_FIXES.md](./AUTH_AND_API_FIXES.md)** - (v0.5.2) 🛠️
   - Bearer token header fix
   - Backend response format unwrap (`data.token`)
   - HTTP 304 caching fix (`cache: 'no-store'`)
   - Next.js image hostname configuration
   - Complete end-to-end flow verification

1. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - (v0.5.1) ✨
   - Complete review of login & auth implementation
   - Frontend-initiated Google OAuth
   - Route protection with middleware
   - Token verification with backend
   - Setup instructions & troubleshooting

1. **[FRONTEND_OAUTH_FLOW.md](./FRONTEND_OAUTH_FLOW.md)** - (v0.5.1) 🔐
   - Frontend OAuth implementation details
   - Google token → backend verification → JWT
   - Security features & best practices
   - Backend implementation examples

2. **[LOGIN_IMPLEMENTATION.md](./LOGIN_IMPLEMENTATION.md)** - (v0.5.0) 🔑
   - Dedicated login page design
   - Route protection middleware
   - Token storage strategy
   - Testing checklist

3. **[API_INTEGRATION.md](./API_INTEGRATION.md)** - (v0.4.0) 🚀
   - Backend API integration
   - Real API calls for all operations
   - Async job polling
   - Token-based authorization

1. **[GALLERY_REGENERATE_UPDATE.md](./GALLERY_REGENERATE_UPDATE.md)** - v0.3.0
   - Gallery page scrolling fix
   - Simplified card design (no badges)
   - 16:9 aspect ratio images
   - Working download functionality
   - Regenerate workflow with context preservation
   - Form height alignment fix

2. **[IMAGE_INPUT_SUPPORT.md](./IMAGE_INPUT_SUPPORT.md)** - NEW FEATURE (v0.3.0)
   - Image upload to prompts
   - Reference image as payload
   - Regenerate button workflow
   - Form population on regenerate

2. **[RECENT_UPDATES.md](./RECENT_UPDATES.md)** - What's new (v0.2.0)
   - UI/UX enhancements
   - Image editing with modal
   - Keyboard shortcuts
   - Real-time feedback features

---

## 🚀 Getting Started

**New to the project?** Start with these:

1. **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Quick start guide
   - How to install dependencies
   - How to run the dev server
   - Project tour and exploration
   - Troubleshooting

2. **[README.md](./README.md)** - Main documentation
   - Project overview
   - Features list
   - Technology stack
   - Setup instructions
   - Project structure

---

## 📖 Understanding the Project

**Want to understand how it works?**

3. **[API_INTEGRATION.md](./API_INTEGRATION.md)** - Backend API integration (v0.4.0)
   - Architecture changes
   - Files created & modified
   - Data flow diagrams
   - Authentication flow
   - Generation with polling
   - Error handling
   - Environment setup
   - API endpoints used
   - Troubleshooting

4. **[IMPLEMENTATION_REVIEW.md](./IMPLEMENTATION_REVIEW.md)** - What was built
   - Architecture overview
   - What's implemented vs not yet
   - Design decisions explained
   - Implementation details
   - Performance optimizations
   - Next steps for development

5. **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - Project details
   - Project summary
   - File structure
   - Key features
   - Data model
   - API endpoints (to build)
   - Deployment info

---

## 🎨 Design & Components

**Building or customizing UI?**

6. **[DESIGN_NOTES.md](./DESIGN_NOTES.md)** - Design system
   - Color palette
   - Typography
   - Spacing system
   - Component architecture
   - Responsive design patterns
   - CSS variables
   - Accessibility standards

7. **[COMPONENTS.md](./COMPONENTS.md)** - Component library
   - All UI components with examples
   - Button, Input, Card, Badge, etc.
   - Usage patterns
   - Tailwind CSS utilities
   - Creating new components

---

## ⚡ Developer Reference

**Need quick answers?**

8. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Developer cheat sheet
   - Common commands
   - File locations
   - Component imports
   - Tailwind utilities
   - Common patterns
   - Keyboard shortcuts
   - Git workflow

---

## 📊 Documentation Map

| Doc | Purpose | Audience | Read Time |
|-----|---------|----------|-----------|
| API_INTEGRATION | Backend API integration | Developers/Full-Stack | 25 min |
| GALLERY_REGENERATE_UPDATE | Gallery & regenerate improvements | Developers/PMs | 20 min |
| IMAGE_INPUT_SUPPORT | Image input feature guide | Developers/PMs | 20 min |
| GETTING_STARTED | How to run the app | Everyone | 10 min |
| README | Overview & features | Everyone | 15 min |
| IMPLEMENTATION_REVIEW | What was built | Developers | 20 min |
| PROJECT_OVERVIEW | Architecture & design | Leads/Architects | 20 min |
| DESIGN_NOTES | Design system | Designers/Frontend | 15 min |
| COMPONENTS | Component library | Developers | 20 min |
| QUICK_REFERENCE | Quick lookups | Developers | 5 min (reference) |

---

## 🎯 By Role

### Frontend Developer
1. GETTING_STARTED - Get running locally
2. IMPLEMENTATION_SUMMARY - Overview of login & auth system
3. FRONTEND_OAUTH_FLOW - How Google OAuth works
4. API_INTEGRATION - How API is integrated
5. GALLERY_REGENERATE_UPDATE - Latest gallery improvements
6. IMAGE_INPUT_SUPPORT - Image input feature guide
7. QUICK_REFERENCE - Common patterns
8. COMPONENTS - Available components
9. DESIGN_NOTES - Styling system

### Full-Stack Developer
1. GETTING_STARTED - Get running locally
2. IMPLEMENTATION_SUMMARY - Complete implementation overview
3. FRONTEND_OAUTH_FLOW - OAuth architecture
4. API_INTEGRATION - Complete API integration guide
5. GALLERY_REGENERATE_UPDATE - Latest improvements
6. PROJECT_OVERVIEW - Overall architecture
7. QUICK_REFERENCE - Common patterns

### Backend Developer
1. README - Project overview
2. IMPLEMENTATION_SUMMARY - What frontend does
3. FRONTEND_OAUTH_FLOW - Backend OAuth requirements
4. API_INTEGRATION - Frontend API usage
5. PROJECT_OVERVIEW - API design

### Designer
1. DESIGN_NOTES - Design system
2. COMPONENTS - Component variations
3. PROJECT_OVERVIEW - Feature specs

### Project Manager
1. README - What it does
2. API_INTEGRATION - What was integrated
3. IMPLEMENTATION_REVIEW - What's done
4. PROJECT_OVERVIEW - Next steps

### New Team Member
1. GETTING_STARTED - Setup & tour
2. README - What the project is
3. API_INTEGRATION - How it works with backend
4. QUICK_REFERENCE - Handy tips
5. DESIGN_NOTES - How things look

---

## 🔍 Quick Answers

### "What's new in the latest update?"
→ See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - v0.5.1 Login & Authentication

### "How does Google OAuth work?"
→ See [FRONTEND_OAUTH_FLOW.md](./FRONTEND_OAUTH_FLOW.md) - Frontend OAuth Implementation

### "How is login implemented?"
→ See [LOGIN_IMPLEMENTATION.md](./LOGIN_IMPLEMENTATION.md) - Login Page Design

### "How does the frontend connect to the backend?"
→ See [API_INTEGRATION.md](./API_INTEGRATION.md) - API Architecture & Data Flow

### "How do I set up authentication?"
→ See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Setup Requirements

### "How do I upload images with prompts?"
→ See [IMAGE_INPUT_SUPPORT.md](./IMAGE_INPUT_SUPPORT.md) - Image Input Guide

### "How do I run the app?"
→ See [GETTING_STARTED.md](./GETTING_STARTED.md) - Setup & Run

### "What components are available?"
→ See [COMPONENTS.md](./COMPONENTS.md) - Component Library

### "What's the color palette?"
→ See [DESIGN_NOTES.md](./DESIGN_NOTES.md) - Color System

### "What files do I edit?"
→ See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - File Locations

### "How do I add a new page?"
→ See [COMPONENTS.md](./COMPONENTS.md) - Creating New Components

### "What's the folder structure?"
→ See [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) - Project Structure

### "What changed recently?"
→ See [RECENT_UPDATES.md](./RECENT_UPDATES.md) - Latest Updates

### "How do I commit code?"
→ See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Git Workflow

---

## 📚 External Resources

- **[Next.js Docs](https://nextjs.org/docs)** - Framework reference
- **[Tailwind CSS](https://tailwindcss.com/docs)** - Styling
- **[TypeScript](https://www.typescriptlang.org/docs)** - Language
- **[React 18](https://react.dev)** - UI library

---

## 📝 Document Versions

| Doc | Last Updated | Status |
|-----|--------------|--------|
| NICHE_DESIGN_SETUP | 2026-05-20 | ✅ NEW (v0.6.0) 🌟 START HERE |
| CHAT_REFERENCE_LOADING_FIXES | 2026-05-19 | ✅ Current (v0.5.5) |
| SIDEBAR_FORM_REGENERATE_UPDATES | 2026-05-19 | ✅ Current (v0.5.4) |
| DESIGNS_SIDEBAR_UPDATE | 2026-05-19 | ✅ Current (v0.5.3) |
| AUTH_AND_API_FIXES | 2026-05-19 | ✅ Current (v0.5.2) |
| IMPLEMENTATION_SUMMARY | 2026-05-19 | ✅ Current (v0.5.1) |
| FRONTEND_OAUTH_FLOW | 2026-05-19 | ✅ Current (v0.5.1) |
| LOGIN_IMPLEMENTATION | 2026-05-19 | ✅ Current (v0.5.0) |
| API_INTEGRATION | 2026-05-19 | ✅ Current (v0.4.0) |
| GALLERY_REGENERATE_UPDATE | 2026-05-18 | ✅ Current (v0.3.0) |
| IMAGE_INPUT_SUPPORT | 2026-05-18 | ✅ Current (v0.3.0) |
| RECENT_UPDATES | 2024-05-18 | ✅ Current (v0.2.0) |
| GETTING_STARTED | 2024-05-18 | ✅ Current |
| README | 2024-05-18 | ✅ Current |
| IMPLEMENTATION_REVIEW | 2024-05-18 | ⚠️ Outdated (see API_INTEGRATION & GALLERY_REGENERATE_UPDATE) |
| PROJECT_OVERVIEW | 2024-05-18 | ✅ Current |
| DESIGN_NOTES | 2024-05-18 | ✅ Current |
| COMPONENTS | 2024-05-18 | ✅ Current |
| QUICK_REFERENCE | 2024-05-18 | ✅ Current |

---

## ❓ Need Help?

- **Installation issues?** → GETTING_STARTED
- **Can't find something?** → QUICK_REFERENCE
- **Styling questions?** → DESIGN_NOTES
- **Component questions?** → COMPONENTS
- **Architecture questions?** → IMPLEMENTATION_REVIEW or PROJECT_OVERVIEW

---

## 🎯 Next Steps

**Want an overview?** Start with [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Complete review of all changes (v0.5.1)

**Ready to set up authentication?**
1. Read [FRONTEND_OAUTH_FLOW.md](./FRONTEND_OAUTH_FLOW.md) - Understand the flow
2. Follow [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Setup Requirements section
3. Get Google Client ID from Google Cloud Console
4. Update `.env.local` with your Client ID
5. Implement backend `/api/auth/verify-google` endpoint

**Ready to start using the app?**

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
# Add to .env.local:
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id

# 3. Start dev server
npm run dev

# 4. Open browser
http://localhost:3000

# 5. Log in with Google
# - Click "Sign in with Google" on login page
# - Complete Google OAuth flow
# - Redirected to home page

# 6. Try the features:
# - Type a prompt and press Enter
# - Upload reference images with the image icon
# - Hover over generated images
# - Click refresh icon to regenerate with previous output as reference
# - Click download icon to save images
```

**Have questions?** 
- **What changed?** → [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **How OAuth works?** → [FRONTEND_OAUTH_FLOW.md](./FRONTEND_OAUTH_FLOW.md)
- **Quick tips?** → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

---

**Last Updated:** May 19, 2026  
**Current Version:** 0.4.0 (Backend API Integration)  
**Status:** ✅ Complete
