# PRD: Markah — Bookmark Manager

## Introduction

Markah is a self-hosted, multi-user bookmark manager that lets users save, organize, search, and share web bookmarks. When a user pastes a URL, the system immediately saves it with auto-fetched metadata (title, description, thumbnail). An AI-powered tagging system (configurable LLM provider) analyzes content and suggests relevant tags. Bookmarks can be organized into nested folders (up to 3 levels) with drag-and-drop, searched via full-text search with tag and folder filters, and shared publicly via unique links.

The app is built with Next.js (App Router), PostgreSQL, and Prisma, authenticated via NextAuth.js (email/password only for v1), styled with Tailwind CSS + shadcn/ui + cult-UI registry, and deployed to a VPS subdomain using Dokploy.

## Goals

- Provide a fast, self-hosted alternative to Raindrop.io / Pocket
- Auto-fetch rich link previews (title, description, thumbnail) when saving a URL
- Use a configurable LLM provider to suggest tags based on fetched page content
- Support full-text search with tag and folder filtering
- Enable folder-based organization (up to 3 levels) with drag-and-drop
- Allow public/private sharing of bookmarks and folders via unique links
- Track bookmark visit count and last-visited timestamp
- Deploy reliably to a VPS subdomain using Dokploy (Docker-based)

## User Stories

### US-001: Set up project foundation

**Description:** As a developer, I need the base project configured with database, auth, and core schema so all other features have a foundation to build on.

**Acceptance Criteria:**

- [ ] PostgreSQL database running and connected via Prisma
- [ ] Prisma schema defined with User, Bookmark, Tag, Folder, BookmarkFolder (join table) models
- [ ] Bookmark model includes: url, title, description, image, favicon, isFavorite, isPublic, shareId, visitCount, lastVisitedAt, position fields
- [ ] Folder model includes: name, parentId (self-referential, max 3 levels), isPublic, shareId, position fields
- [ ] Tag model includes: name (unique per user), color (auto-assigned hash-based hex)
- [ ] BookmarkTag join table for many-to-many bookmark-tag relationship
- [ ] BookmarkFolder join table for many-to-many bookmark-folder relationship
- [ ] NextAuth.js configured with email/password credentials provider only
- [ ] Protected API routes return 401 for unauthenticated requests
- [ ] Seed script creates a test user with sample bookmarks
- [ ] Typecheck and lint pass

### US-002: Landing page

**Description:** As a visitor, I want to see a simple landing page explaining what Markah is so I can decide to register.

**Acceptance Criteria:**

- [ ] Hero section with app name, one-line description, and screenshot/illustration
- [ ] "Get Started" CTA button linking to registration
- [ ] "Sign In" link in header for existing users
- [ ] Light theme, clean minimal design using shadcn/ui components
- [ ] Responsive layout
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: User registration and login

**Description:** As a new user, I want to create an account with email and password so I can start saving bookmarks.

**Acceptance Criteria:**

- [ ] Registration form with email and password fields
- [ ] Password hashed with bcrypt before storing
- [ ] Login form with email/password
- [ ] After login, user is redirected to their dashboard
- [ ] Invalid credentials show an error message
- [ ] Duplicate email registration shows an error message
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Link preview fetching service

**Description:** As a developer, I need a server-side service that fetches a URL and extracts Open Graph / meta tag data so bookmarks are automatically enriched.

**Acceptance Criteria:**

- [ ] Server action accepts a URL and returns `{ title, description, image, favicon }`
- [ ] Parses `<title>`, `og:title`, `og:description`, `og:image`, and favicon
- [ ] Falls back gracefully: missing OG tags use `<title>` and `<meta name="description">`
- [ ] When no image is found, return null (UI will generate a color card fallback)
- [ ] Request timeout of 10 seconds to avoid hanging on slow sites
- [ ] Thumbnail image URL stored (not downloaded/hosted) for v1
- [ ] Typecheck passes

### US-005: Save a bookmark (quick-add)

**Description:** As a user, I want to paste a URL and have it save immediately with auto-fetched metadata so I can bookmark things fast and edit details later.

**Acceptance Criteria:**

- [ ] Persistent URL input bar at the top of the dashboard
- [ ] On paste/submit, bookmark is saved immediately to the database
- [ ] Metadata (title, description, image, favicon) fetched asynchronously and updated on the bookmark
- [ ] AI tag suggestions fetched asynchronously and shown as clickable chips on the new bookmark card
- [ ] If the URL already exists for this user, show the existing bookmark and offer to navigate to it
- [ ] Handles unreachable URLs gracefully: bookmark still saved with URL as title
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: AI-powered tag suggestions

**Description:** As a user, I want the system to suggest relevant tags when I save a bookmark so I can organize without manual effort.

**Acceptance Criteria:**

- [ ] After metadata is fetched, send title + description + URL to a configurable LLM provider
- [ ] LLM provider abstracted behind an interface; provider selected via `LLM_PROVIDER` env var (supports `claude`, `openai`, `ollama`)
- [ ] LLM returns 3-5 suggested tags as lowercase, single-word or hyphenated strings
- [ ] Suggestions displayed as clickable chips the user can accept or dismiss
- [ ] User can also type custom tags manually with autocomplete from existing tags
- [ ] Tags are created if they don't exist, or linked if they do
- [ ] Each new tag auto-assigned a consistent color (deterministic hash of tag name to hex)
- [ ] Graceful fallback if LLM API is unavailable (save bookmark without suggestions)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Browse and manage bookmarks

**Description:** As a user, I want to see all my bookmarks in a list or grid so I can browse and manage them.

**Acceptance Criteria:**

- [ ] Dashboard page shows all bookmarks for the authenticated user
- [ ] Each bookmark card displays: thumbnail (or generated color card with favicon if no image), title, description snippet, tags (colored badges), domain, date saved
- [ ] Toggle between grid view and list view; preference persisted in localStorage
- [ ] Click a bookmark to open the original URL in a new tab (increments visitCount, updates lastVisitedAt)
- [ ] Star/favorite toggle on each bookmark card (filled/unfilled star icon)
- [ ] "Favorites" virtual folder in sidebar showing only favorited bookmarks
- [ ] Edit button opens edit form (change title, description, tags, folders)
- [ ] Delete button with confirmation dialog
- [ ] Cursor-based pagination or infinite scroll for large collections
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Full-text search with filters

**Description:** As a user, I want to search across all my bookmarks and filter by tag or folder so I can quickly find what I saved.

**Acceptance Criteria:**

- [ ] Search input in the dashboard header
- [ ] Search queries against bookmark title, description, URL, and associated tag names
- [ ] Results update as the user types (debounced, 300ms)
- [ ] PostgreSQL full-text search using `tsvector` / `tsquery`
- [ ] Tag filter: clickable tag chips below search bar to narrow results to selected tags
- [ ] Folder filter: selecting a folder in the sidebar scopes search to that folder
- [ ] Filters combinable: text + tag + folder all work together
- [ ] No results state with helpful message
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: Folder organization

**Description:** As a user, I want to organize bookmarks into folders (up to 3 levels deep) so I can group related links.

**Acceptance Criteria:**

- [ ] Sidebar shows folder tree for the authenticated user (always visible on desktop, collapsed on mobile)
- [ ] Create folder (with name input); enforce max 3 levels of nesting
- [ ] Rename and delete folder (delete moves bookmarks to "Unsorted")
- [ ] Folders can be nested (parent-child relationship in DB, max depth 3)
- [ ] Clicking a folder filters the bookmark list to that folder's contents
- [ ] "All Bookmarks", "Favorites", and "Unsorted" as default virtual folders at the top
- [ ] A bookmark can exist in multiple folders (many-to-many via join table)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Drag-and-drop for folders and bookmarks

**Description:** As a user, I want to drag bookmarks into folders and reorder folders so I can organize visually.

**Acceptance Criteria:**

- [ ] Drag a bookmark card onto a folder in the sidebar to add it to that folder
- [ ] Drag folders in the sidebar to reorder them
- [ ] Drag a folder into another folder to nest it (enforce max 3 levels)
- [ ] Visual feedback during drag (highlight drop target)
- [ ] Order persisted to database via a `position` field
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: Public/private sharing

**Description:** As a user, I want to share a bookmark or folder via a unique public link so others can view it without logging in.

**Acceptance Criteria:**

- [ ] Each bookmark and folder has an `isPublic` boolean (default false) and a unique `shareId`
- [ ] Toggle "Make public" in bookmark/folder context menu
- [ ] Public items accessible at `/share/[shareId]`
- [ ] Share page is a minimal read-only list: bookmark cards with thumbnail, title, description, tags, link
- [ ] Private items return 404 on the share URL
- [ ] "Copy link" button for easy sharing
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-012: Dockerize and deploy with Dokploy

**Description:** As a developer, I want to containerize the app and deploy it to a VPS subdomain using Dokploy so it runs reliably in production.

**Acceptance Criteria:**

- [ ] Multi-stage Dockerfile (dependencies -> build -> production)
- [ ] `docker-compose.yml` with app + PostgreSQL services
- [ ] Environment variables documented in `.env.example` (including `LLM_PROVIDER`, `LLM_API_KEY`, `NEXTAUTH_SECRET`, `DATABASE_URL`)
- [ ] Prisma migrations run on container start
- [ ] Health check endpoint at `/api/health`
- [ ] Configured for subdomain deployment (e.g., `markah.yourdomain.com`)
- [ ] Dokploy configuration documented in README
- [ ] App builds and starts successfully in Docker

## Functional Requirements

- FR-1: Users can register with email/password via NextAuth.js (no OAuth in v1)
- FR-2: Open registration — anyone can create an account
- FR-3: Authenticated users can create, read, update, and delete bookmarks
- FR-4: When a URL is submitted, the bookmark is saved immediately; metadata is fetched asynchronously
- FR-5: When a URL already exists for the user, block the duplicate and show the existing bookmark
- FR-6: When no OG image is available, the UI generates a deterministic color card based on the domain
- FR-7: After metadata is fetched, the system sends it to a configurable LLM provider which returns 3-5 suggested tags
- FR-8: LLM provider is abstracted behind an interface; supports Claude, OpenAI, and Ollama via env var
- FR-9: Users can accept, dismiss, or manually add tags to any bookmark
- FR-10: Tags are globally unique per user; each tag auto-assigned a consistent color via name hash
- FR-11: Full-text search queries across bookmark title, description, URL, and tag names
- FR-12: Search supports combined filtering: text query + tag selection + folder scope
- FR-13: Users can create, rename, delete, and nest folders up to 3 levels deep
- FR-14: A bookmark can belong to multiple folders (many-to-many)
- FR-15: Unassigned bookmarks appear in "Unsorted"; favorited bookmarks appear in "Favorites"
- FR-16: Drag-and-drop allows adding bookmarks to folders and reordering folders
- FR-17: Users can favorite/unfavorite bookmarks via a star toggle
- FR-18: Clicking a bookmark increments its visit count and updates last-visited timestamp
- FR-19: Users can toggle any bookmark or folder to public, generating a unique share URL
- FR-20: Public share pages are minimal read-only lists, viewable without authentication
- FR-21: All API routes require authentication except public share pages, landing page, and auth endpoints
- FR-22: The app is containerized with Docker and deployable via Dokploy to a VPS subdomain
- FR-23: Dashboard supports grid and list view toggle, persisted in localStorage

## Non-Goals

- No OAuth providers (Google, GitHub) in v1 — email/password only
- No user profile or settings page in v1
- No browser extension (v1 is web-only)
- No bookmark import/export (e.g., from Chrome, Pocket)
- No real-time collaboration or multi-user shared folders
- No full-page content archival or caching (only metadata is stored)
- No mobile-native app
- No RSS feed monitoring or automatic bookmark creation
- No image/thumbnail hosting (store external URLs only)
- No tag management page (rename, merge, delete) in v1
- No bulk actions (multi-select) in v1
- No rate limiting on link preview fetching in v1
- No bookmark notes/annotations in v1

## Design Considerations

- Light theme only for v1; clean, minimal UI focused on readability and fast interactions
- Sidebar (fixed ~250px on desktop) for folder navigation; collapses to hamburger on mobile
- Main area shows bookmark grid or list with toggle
- Styled with Tailwind CSS + shadcn/ui + cult-UI registry
- Bookmark cards show generated color card (deterministic from domain) when no thumbnail available
- Tags displayed as colored badges (auto-assigned color from name hash)
- Quick-add URL bar always visible at the top of the dashboard
- Drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable`
- Simple landing page with hero, description, and CTA

## Technical Considerations

- **Framework:** Next.js 14+ (App Router, Server Components + Server Actions)
- **Data Fetching:** Server Components for initial page loads; React Query for interactive features (search, drag-drop, optimistic updates)
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js v5 (credentials provider only for v1)
- **Link Preview:** Server action with `node-html-parser` or `cheerio` for parsing meta tags
- **AI Tagging:** Configurable LLM provider behind an interface (`LLM_PROVIDER` env var); implementations for Claude API, OpenAI API, and Ollama
- **Tag Colors:** Deterministic hash of tag name to HSL color (consistent across renders, no DB storage needed beyond the hex value)
- **Thumbnail Fallback:** Deterministic hash of domain to background color + favicon overlay for missing OG images
- **Search:** PostgreSQL `tsvector`/`tsquery` full-text search on a generated column; combined with tag and folder filters
- **Drag-and-Drop:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **Bookmark-Folder Relationship:** Many-to-many via `BookmarkFolder` join table
- **Folder Tree:** Self-referential `Folder` model with `parentId`; enforce max depth 3 at application level
- **Styling:** Tailwind CSS + shadcn/ui + cult-UI registry
- **Deployment:** Docker multi-stage build, `docker-compose.yml` for app + Postgres, deployed via Dokploy to a VPS subdomain

## Success Metrics

- User can paste a URL and see it saved with fetched metadata in under 3 seconds
- AI tag suggestions appear within 2 seconds of metadata fetch
- Full-text search with filters returns results in under 500ms for collections up to 10,000 bookmarks
- Drag-and-drop reorder persists correctly without data loss
- Duplicate URL detection prevents saving the same URL twice
- Public share links load correctly for unauthenticated visitors
- Docker container builds and starts successfully on a fresh VPS with Dokploy

## Open Questions

- Should search indexing happen synchronously on save or via a background job?
- Should folders have an icon or color picker for visual differentiation in a future version?
- What default LLM model to recommend in documentation (cost vs quality)?
