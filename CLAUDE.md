# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Markah is a self-hosted bookmark manager built with Next.js 16, React 19, TypeScript, PostgreSQL, and Prisma ORM. Features include nested folder organization, full-text search, public sharing, drag-and-drop, and AI-powered tag suggestions.

## Essential Commands

```bash
bun install              # Install dependencies (bun is the package manager)
bun run dev              # Start dev server on port 3000
bun run build            # Production build (standalone output)
npx eslint               # Lint (do NOT use `next lint` — broken in Next.js 16)
npx prisma migrate dev   # Run migrations in development
npx prisma migrate deploy # Run migrations in production/Docker
npx prisma db seed       # Seed test data (test@markah.com / password123)
npx prisma generate      # Regenerate Prisma client after schema changes
```

No formal test framework is configured. Testing is manual using seed data.

## Architecture

### Tech Stack
- **Frontend:** Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui (new-york style, stone palette, lucide icons)
- **Backend:** Server Actions for all mutations (`"use server"` in `lib/actions/`), minimal API routes
- **Database:** PostgreSQL 16 + Prisma v6 (NOT v7), full-text search via tsvector
- **Auth:** NextAuth.js v5 (beta.30), credentials provider, JWT strategy
- **AI:** Pluggable LLM providers (Claude/OpenAI/Ollama) for tag suggestions
- **Drag & Drop:** @dnd-kit/core v6

### Key Directories
- `app/(auth)/` — Login/register pages with centered layout
- `app/dashboard/` — Protected dashboard (server component layout fetches data, passes to client `DashboardShell`)
- `app/share/[shareId]/` — Public read-only share pages
- `lib/actions/` — Server actions: `bookmark.ts`, `folder.ts`, `auth.ts`
- `lib/services/` — LLM provider (`llm-provider.ts`), link preview (`link-preview.ts`)
- `lib/auth.ts` — NextAuth config, exports `{ handlers, signIn, signOut, auth }`
- `lib/session.ts` — `getCurrentUser()` and `requireUser()` helpers
- `lib/prisma.ts` — Prisma client singleton
- `components/` — React components (mix of server and client)
- `prisma/schema.prisma` — Database schema (User, Bookmark, Folder, Tag, BookmarkTag, BookmarkFolder)
- `types/next-auth.d.ts` — Session type augmentation

### Data Flow Pattern
Server component (`app/dashboard/layout.tsx`) fetches data → passes to client `DashboardShell` → distributes to sidebar and content. Mutations go through server actions in `lib/actions/`, then `router.refresh()` triggers re-render.

## Codebase Patterns

### Next.js 16 Specifics
- `searchParams` in page components is a Promise — must `await searchParams`
- Use `<img>` for external bookmark images (not `next/image` — arbitrary domains can't be preconfigured)
- Pass dates as ISO strings from server to client components (Date objects can't cross the boundary)
- `next lint` doesn't work (Next.js 16 changed CLI) — use `npx eslint` directly

### Prisma & Database
- Use Prisma v6, not v7 (v7 requires `prisma.config.ts` and removed `url` from schema datasource)
- Prisma client singleton at `lib/prisma.ts` — import from `@/lib/prisma`
- Join table queries: `include: { tags: { include: { tag: true } } }`, flatten with `.map(bt => bt.tag)`
- Tag upsert: `tx.tag.upsert({ where: { name_userId: { name, userId } }, update: {}, create: { name, userId } })`
- Multi-step mutations: `prisma.$transaction(async (tx) => { ... })`
- Unsorted bookmarks filter: `folders: { none: {} }`
- AND tag filter (must have ALL): `AND: tagIds.map(tagId => ({ tags: { some: { tagId } } }))`
- Raw SQL for tsvector: `Prisma.sql` tagged template + `$queryRaw<Type[]>`
- Raw SQL migrations go in `prisma/migrations/YYYYMMDD_description/migration.sql` — applied via `npx prisma migrate deploy`
- Cursor-based pagination: `take: limit + 1`, check `length > limit` for hasMore, `slice(0, limit)` for results
- Seed script uses `npx tsx prisma/seed.ts` — tsx is auto-installed by npx

### Auth
- Auth config in `lib/auth.ts`, exports `{ handlers, signIn, signOut, auth }`
- Session helpers in `lib/session.ts` — use `getCurrentUser()` or `requireUser()` for auth checks
- Use `requireUser()` in all server actions for auth
- Middleware at `middleware.ts` — public routes: `/`, `/login`, `/register`, `/share/*`
- NextAuth v5 credentials provider with JWT strategy — no Prisma adapter
- Type augmentations for next-auth in `types/next-auth.d.ts`

### UI Conventions
- shadcn/ui with "new-york" style, stone base color, lucide icons
- Avoid `setState` inside `useEffect` — ESLint `react-hooks/set-state-in-effect` rule. Use event handlers or `useSyncExternalStore` instead
- `useSyncExternalStore` for localStorage-backed state (avoids hydration mismatch)
- Destructive confirmations use shadcn/ui `AlertDialog` (not `Dialog`)
- Hover-reveal buttons: `opacity-0 group-hover:opacity-100` pattern
- Toast notifications: `toast()` from `sonner` package, `Toaster` in root layout
- Folder type exported from `components/sidebar.tsx` — import as `type Folder`
- Parent-to-child `onDelete` callback pattern: parent filters state, child calls after server action succeeds — avoids full page reload
- Path alias: `@/*` maps to project root

### Dashboard Architecture
- Dashboard layout (`app/dashboard/layout.tsx`) is a server component that fetches data, passes to client `DashboardShell`
- Sidebar is a client component that reads `?folder=` query param for active state
- Mobile sidebar uses shadcn/ui Sheet component (left side) with hamburger menu trigger
- Folder tree built from flat Prisma query via `buildFolderTree()` helper in dashboard layout
- `DashboardContent` manages combined filters (text search + tag IDs + folder)
- Folder filtering in `getBookmarks`: pass `filter` param ('all' | 'favorites' | 'unsorted' | folder ID)

### Drag & Drop (@dnd-kit/core v6)
- DndContext wraps `DashboardShell` (sidebar + content)
- `useDraggable` in wrapper component (`DraggableBookmarkCard`), `useDroppable` in `FolderItem`
- PointerSensor with `distance: 8` to avoid click interference
- Combining useDraggable + useDroppable on same element: `ref={(node) => { setDropRef(node); setDragRef(node); }}`
- Folder reordering uses `FolderDropGap` droppable components between items

### Sharing
- `ShareDialog` component reusable for bookmarks and folders via `type` prop
- Share URL format: `/share/[shareId]` — shareId generated via `crypto.randomUUID().slice(0,12)`, preserved across toggles
- Share server actions: `toggleBookmarkShare`/`toggleFolderShare` in respective action files

### LLM / AI Tags
- LLM provider service at `lib/services/llm-provider.ts` — `getLLMProvider()` factory returns `null` if unconfigured
- Env vars: `LLM_PROVIDER` (claude|openai|ollama), `LLM_API_KEY`
- Tag suggestions need a delay (~2s) after bookmark save to let metadata fetch complete first

### Docker
- `output: "standalone"` in `next.config.ts` for Docker builds
- `docker-entrypoint.sh` runs `prisma migrate deploy` before starting
- PostgreSQL on port 5433 in docker-compose
- `.env.example` is gitignored by `.env*` — use `git add -f .env.example` to commit
- Multi-stage build with bun for deps/build, node:20-alpine for runtime
- Server-side depth enforcement for folder nesting: walk parentId chain to count depth

## Ralph Agent System

This project uses the Ralph autonomous agent for feature development. Config in `scripts/ralph/`:
- `prd.json` — User stories with pass/fail status
- `progress.txt` — Historical per-story progress logs and learnings
- `ralph.sh` — Agent runner script
- `CLAUDE.md` — Agent-specific instructions
