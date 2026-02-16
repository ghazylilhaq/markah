# Markah — Future Roadmap

Features deferred from v1, tracked here for future consideration.

## Authentication & Users

- [ ] OAuth providers (Google, GitHub) via NextAuth.js
- [ ] User profile/settings page (name, avatar, password change, connected accounts)
- [ ] Invite-only registration mode (admin toggle)
- [ ] Dark mode / system-aware theme toggle

## Bookmarks

- [ ] Bookmark notes/annotations (plain text or markdown)
- [ ] Bulk actions (multi-select, bulk move/delete/tag)
- [ ] Bookmark import/export (Chrome, Firefox, Pocket, Raindrop.io)
- [ ] Browser extension for one-click saving
- [ ] Screenshot-based thumbnails via external service (microlink, screenshotone) when no OG image

## Tags

- [ ] Tag management page (rename, merge duplicates, delete unused)
- [ ] User-assigned tag colors (color picker override)

## Folders

- [ ] Folder icons or color picker for visual differentiation
- [ ] Configurable max nesting depth (currently hardcoded at 3)

## Search

- [ ] Background search indexing (async job on save instead of synchronous)
- [ ] Saved/pinned search queries

## Sharing

- [ ] Branded public profile page (linktree-style, user name + avatar)
- [ ] Embeddable widget (embed code for shared bookmarks on external sites)
- [ ] Multi-user shared folders (real-time collaboration)

## Infrastructure

- [ ] Rate limiting on link preview fetching (per-user or global)
- [ ] RSS feed monitoring / automatic bookmark creation
- [ ] Full-page content archival (cache page content, not just metadata)
- [ ] Image/thumbnail hosting (download and serve OG images locally)
- [ ] Mobile-native app
