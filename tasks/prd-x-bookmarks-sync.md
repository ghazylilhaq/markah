# PRD: X (Twitter) Bookmarks Sync

## Introduction

Allow Markah users to connect their X (Twitter) account via OAuth 2.0 and automatically sync their X bookmarks into their Markah library. Bookmarked posts are captured periodically and on demand, deduplicated, enriched with AI-generated tags, and organized into a mirrored folder structure. Users retain full ownership of their data and can disconnect at any time while keeping imported bookmarks.

## Goals

- Enable X account connection via OAuth 2.0 with PKCE (read-only bookmark access)
- Let users choose to import all existing bookmarks or only new ones on connect
- Automatically poll for new X bookmarks via a cron-triggered API route
- Provide a manual "Sync Now" button for immediate imports
- Store a stable post URL and minimal metadata (author handle, text, date) per bookmarked post
- Deduplicate imports — merge with existing manual bookmarks when URLs match
- Auto-tag imported bookmarks using the existing AI tag suggestion system
- Mirror X bookmark folders as subfolders under an auto-created "X Bookmarks" folder
- Cap imports per sync cycle via configurable `MAX_SYNC_BOOKMARKS` env var
- Allow users to disconnect X without losing previously imported bookmarks

## User Stories

### US-001: Add X integration database schema

**Description:** As a developer, I need database tables to store X OAuth credentials and track which bookmarks came from X, so the system can manage sync state and avoid duplicates.

**Acceptance Criteria:**

- [ ] Create `XIntegration` model with fields: `id`, `userId` (unique), `xUserId` (string — the X user's numeric ID), `xHandle` (string — the @username), `accessToken`, `refreshToken`, `expiresAt`, `lastSyncedAt` (nullable), `lastSyncedTweetId` (nullable string — for resume), `syncEnabled` (default true), `retryCount` (int, default 0), `lastError` (nullable string), timestamps
- [ ] Add `source` field (nullable string) to `Bookmark` model to track origin (`"x"` or `null` for manual)
- [ ] Add `externalId` field (nullable string) to `Bookmark` model for the X post ID
- [ ] Add unique constraint on `[externalId, userId]` where `externalId` is not null, to prevent duplicates
- [ ] Add relation from `User` to `XIntegration` (one-to-one)
- [ ] Generate and run migration successfully
- [ ] Typecheck/lint passes

### US-002: Implement X OAuth 2.0 connection flow

**Description:** As a user, I want to connect my X account to Markah so the app can access my bookmarks with my permission.

**Acceptance Criteria:**

- [ ] User provides their own X Developer App credentials via `X_CLIENT_ID` and `X_CLIENT_SECRET` env vars
- [ ] Create `app/api/auth/x/route.ts` — initiates OAuth 2.0 with PKCE, redirects to X consent screen
- [ ] Request only `bookmark.read`, `tweet.read`, and `users.read` scopes
- [ ] Create `app/api/auth/x/callback/route.ts` — handles OAuth callback, exchanges code for access + refresh tokens
- [ ] Fetch the authenticated X user's ID and handle via `GET /2/users/me` after token exchange
- [ ] Store tokens, `xUserId`, and `xHandle` in `XIntegration` table linked to current Markah user
- [ ] Handle token refresh transparently when access token expires (X tokens expire after 2 hours)
- [ ] Store tokens as plaintext in the database (self-hosted, DB access already restricted)
- [ ] Show success toast after connection completes
- [ ] Redirect back to settings/integrations page after OAuth flow
- [ ] Add `X_CLIENT_ID`, `X_CLIENT_SECRET`, and `X_REDIRECT_URI` to `.env.example` with setup instructions
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Create integrations settings page

**Description:** As a user, I want a settings page where I can manage my X connection, so I can connect, see sync status, trigger syncs, and disconnect.

**Acceptance Criteria:**

- [ ] Create `/dashboard/settings` page accessible from sidebar
- [ ] Add settings gear icon to the bottom of the sidebar (above user info/logout if present)
- [ ] Design the page with a reusable `IntegrationCard` component pattern (generic enough for future platforms)
- [ ] Show X integration card with connect/disconnect state
- [ ] When disconnected: show "Connect X Account" button that starts OAuth flow
- [ ] When connected: show connected X handle (`@username`), last sync time, sync toggle (`Switch` component), and import stats
- [ ] On first connect: show a prompt asking "Import existing bookmarks?" with a toggle (default on)
- [ ] Include "Sync Now" button (disabled while sync is in progress)
- [ ] Show progress bar during sync/import: "47/200 bookmarks imported" — runs in background, user can navigate away and return to see progress
- [ ] Include "Disconnect" button with `AlertDialog` confirmation that explains bookmarks will be kept
- [ ] Disconnect removes `XIntegration` record but does NOT delete any bookmarks
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Build X API bookmark fetching service

**Description:** As a developer, I need a service that fetches bookmarks from the X API v2, so the sync system has a reliable data source.

**Acceptance Criteria:**

- [ ] Create `lib/services/x-bookmarks.ts` service module
- [ ] Implement `fetchXBookmarks(accessToken, xUserId, options?: { sinceId?, maxResults? })` that calls X API v2 `GET /2/users/:id/bookmarks`
- [ ] Request tweet fields: `id`, `text`, `created_at`, `author_id`
- [ ] Request user expansions to get author `username` and `name`
- [ ] Handle pagination (X API returns max 100 per request) up to `MAX_SYNC_BOOKMARKS` total (env var, default 50)
- [ ] Handle rate limiting: respect 429 responses with `Retry-After` header, return partial results collected so far
- [ ] Handle expired tokens by refreshing via `refreshToken` before retrying (call a shared `refreshXToken()` helper)
- [ ] Implement `fetchXBookmarkFolders(accessToken, xUserId)` to retrieve X bookmark folder structure (if API supports it; return empty array if endpoint unavailable)
- [ ] Return typed array of `{ tweetId, text, authorHandle, authorName, createdAt, url, folderName? }` where url is `https://x.com/{authorHandle}/status/{tweetId}`
- [ ] Typecheck/lint passes

### US-005: Implement bookmark sync server action

**Description:** As a developer, I need a server action that takes fetched X bookmarks and upserts them into the Markah database, deduplicating by external ID and merging with manually added duplicates.

**Acceptance Criteria:**

- [ ] Create `lib/actions/x-sync.ts` with `syncXBookmarks()` server action
- [ ] Require authenticated user via `requireUser()`
- [ ] Fetch user's `XIntegration` record; error if not connected
- [ ] Call X bookmarks service to fetch new bookmarks since `lastSyncedTweetId`
- [ ] For each bookmark: check if `externalId` already exists for this user — if so, skip
- [ ] Also check if the URL (`x.com/{handle}/status/{id}`) already exists as a manual bookmark — if so, **merge**: update existing bookmark with `source: "x"` and `externalId`, keeping user's existing tags and folders
- [ ] Create new `Bookmark` records with `source: "x"`, `externalId: tweetId`, `url`, `title` (first 100 chars of tweet text), `description` (full tweet text)
- [ ] Auto-create "X Bookmarks" parent folder on first sync if it doesn't exist
- [ ] Place imported bookmarks into "X Bookmarks" folder, or into a matching subfolder if X bookmark folders were fetched (mirror structure)
- [ ] If X folder API is unavailable or user has no folders, all imports go into the root "X Bookmarks" folder
- [ ] Run AI tag suggestions on each new bookmark (same pattern as manual bookmark add)
- [ ] Update `XIntegration.lastSyncedAt` and `lastSyncedTweetId` after successful sync
- [ ] Revalidate dashboard path after sync
- [ ] Return `{ success: true, imported: number, merged: number, skipped: number }`
- [ ] Typecheck/lint passes

### US-006: Add sync error recovery and auto-retry

**Description:** As a developer, I need the sync system to handle failures gracefully, resuming from where it left off and retrying automatically.

**Acceptance Criteria:**

- [ ] Track `lastSyncedTweetId` on `XIntegration` — each successful bookmark import updates this incrementally (not just at end of sync)
- [ ] On failure (network error, rate limit, API error), save progress so far and record `lastError` on `XIntegration`
- [ ] Next sync automatically resumes from `lastSyncedTweetId` (no duplicate work)
- [ ] Implement auto-retry: on failure, schedule retry after 5-minute cooldown, up to 3 attempts (`retryCount` field)
- [ ] Reset `retryCount` to 0 on successful sync
- [ ] After 3 failed retries, stop retrying and set `syncEnabled: false` with `lastError` explaining why
- [ ] Show error state on settings page: "Last sync failed: [error message]. Sync paused after 3 retries."
- [ ] User can manually re-enable sync and trigger retry from settings
- [ ] Typecheck/lint passes

### US-007: Add periodic background sync via cron API route

**Description:** As a user, I want my X bookmarks to sync automatically on a regular interval so I don't have to manually trigger it.

**Acceptance Criteria:**

- [ ] Create API route `app/api/cron/sync-x/route.ts` that syncs all users with `syncEnabled: true`
- [ ] Protect endpoint with `CRON_SECRET` env var (reject requests without valid `Authorization: Bearer <secret>` header)
- [ ] Process users sequentially to respect X API rate limits
- [ ] Log sync results per user (imported count, errors)
- [ ] Skip users whose tokens have expired and can't be refreshed (set `lastError`, don't disable)
- [ ] Endpoint is callable by external cron services (system crontab, Vercel Cron, etc.)
- [ ] Add `CRON_SECRET` to `.env.example`
- [ ] Document crontab setup in README: `*/30 * * * * curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-x`
- [ ] Typecheck/lint passes

### US-008: Display X bookmark source indicator

**Description:** As a user, I want to see which bookmarks came from X so I can distinguish them from manually added bookmarks.

**Acceptance Criteria:**

- [ ] Show small X logo badge on bookmark cards where `source === "x"`
- [ ] Badge is subtle (grayscale icon, small size) and doesn't clutter the card
- [ ] Clicking the badge opens the original post on X in a new tab
- [ ] Badge visible in both grid and list views
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-009: Add source filter to bookmark list

**Description:** As a user, I want to filter my bookmarks by source (all, manual, X) so I can browse just my X imports when needed.

**Acceptance Criteria:**

- [ ] Add source filter dropdown/tabs to `DashboardContent` filter bar
- [ ] Options: "All Sources", "Manual", "X"
- [ ] Filter persists in URL search params (`?source=x`)
- [ ] Combines correctly with existing text search, tag filter, and folder filter
- [ ] Update `getBookmarks` server action to accept optional `source` filter
- [ ] Empty state shows appropriate message when no bookmarks match
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Users connect their X account via OAuth 2.0 with PKCE from the settings page
- FR-2: Users must create their own X Developer App and provide `X_CLIENT_ID` and `X_CLIENT_SECRET` via env vars (self-hosted model)
- FR-3: The system requests only `bookmark.read`, `tweet.read`, and `users.read` scopes (minimal permissions)
- FR-4: OAuth tokens are stored plaintext in the database, linked to the authenticated Markah user
- FR-5: On first connect, users choose whether to import existing historical bookmarks or only new ones going forward
- FR-6: The system polls the X API v2 for new bookmarks via a cron-triggered API route protected by `CRON_SECRET`
- FR-7: Users can trigger a manual sync via "Sync Now" button on the settings page
- FR-8: Each imported bookmark stores: stable URL (`x.com/{handle}/status/{id}`), tweet text (truncated as title, full as description), author handle, and creation date
- FR-9: Bookmarks are deduplicated by `(externalId, userId)` — a tweet bookmarked on X is never imported twice
- FR-10: If a manually added bookmark URL matches an X bookmark, the existing bookmark is merged (enriched with `source` and `externalId`) rather than duplicated
- FR-11: Imports are capped per sync cycle via `MAX_SYNC_BOOKMARKS` env var (default 50)
- FR-12: AI tag suggestions run automatically on each newly imported bookmark
- FR-13: An "X Bookmarks" parent folder is auto-created on first sync; X bookmark folders are mirrored as subfolders when the API supports it, otherwise all imports go into the parent folder
- FR-14: X-imported bookmarks are fully interoperable with Markah features: folders, tags, search, favorites, sharing, drag-and-drop
- FR-15: Users can disconnect their X account; all previously imported bookmarks remain in their library
- FR-16: A source indicator on bookmark cards shows which bookmarks came from X
- FR-17: Users can filter bookmarks by source (all / manual / X)
- FR-18: Sync is one-way (X → Markah): unbookmarking on X does not remove bookmarks from Markah
- FR-19: Deleted tweets: bookmark stays in Markah with stored metadata; URL may 404 but text remains searchable
- FR-20: On sync failure, the system resumes from the last successfully synced tweet ID and auto-retries up to 3 times with 5-minute cooldowns
- FR-21: After 3 consecutive failures, sync is paused automatically; user can re-enable from settings

## Non-Goals

- No write access to X (we don't create/delete bookmarks on X)
- No syncing of X likes, retweets, or timeline — only bookmarks
- No media download or caching (images/videos remain hosted on X)
- No thread expansion or quoted tweet embedding
- No real-time streaming (webhook-based sync) — polling only
- No multi-platform support in this iteration (only X, not Mastodon/Bluesky/etc.)
- No in-app X post rendering (embedded tweets) — just metadata and a link
- No token encryption (self-hosted model, DB access already restricted)
- No built-in cost tracking or API usage display — user monitors X Developer dashboard
- No two-way sync (unbookmarking on X does not affect Markah)
- No detection or handling of deleted tweets — bookmarks remain as-is

## Design Considerations

- Reuse existing shadcn/ui components: `Card`, `Button`, `Badge`, `Switch`, `DropdownMenu`, `AlertDialog`, `Progress`
- Settings page uses a reusable `IntegrationCard` component — designed for X first but structured so future integrations (Mastodon, Bluesky) can add their own card
- Settings link is a gear icon at the bottom of the sidebar
- X logo badge uses the "𝕏" glyph or a small SVG icon, rendered in grayscale
- Source filter integrates visually with the existing tag filter bar in `DashboardContent`
- "Connect X Account" button uses outline variant, not overly prominent
- First-connect flow includes a toggle: "Import existing bookmarks?" (default on)
- Progress bar during sync shows "47/200 bookmarks imported" — persists on settings page even when user navigates away and returns
- Disconnect uses `AlertDialog` confirmation: "Your imported bookmarks will be kept. Only the X connection will be removed."

## Technical Considerations

- **X API pricing:** X API v2 uses pay-per-use pricing (not subscription). Bookmark reads cost per tweet. Users must create their own X Developer App at developer.x.com. Document setup process and cost implications in README.
- **Env vars required:** `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI`, `CRON_SECRET`, `MAX_SYNC_BOOKMARKS` (optional, default 50)
- **Token refresh:** X OAuth 2.0 access tokens expire after 2 hours. Create a shared `refreshXToken(integration)` helper used by both manual sync and cron sync.
- **OAuth callback route:** `app/api/auth/x/callback/route.ts` — separate from NextAuth to avoid conflicts with the existing credentials auth flow.
- **Sync cap:** `MAX_SYNC_BOOKMARKS` env var limits how many bookmarks are fetched per sync cycle. Prevents runaway API costs. Pagination stops when cap is reached.
- **Resume logic:** `lastSyncedTweetId` on `XIntegration` enables incremental sync. Each successfully imported bookmark updates this field within the transaction, so failures mid-sync don't cause gaps or duplicates.
- **Auto-retry:** On failure, increment `retryCount`, set `lastError`, and on next cron trigger, retry if `retryCount < 3`. After 3 failures, set `syncEnabled: false`.
- **X bookmark folders API:** As of 2025, the X API v2 may not expose bookmark folder endpoints. The service should attempt to fetch folders and gracefully fall back to a flat "X Bookmarks" parent folder if the endpoint returns 404 or is unavailable.
- **URL matching for merge:** When checking for manual duplicates, normalize URLs: strip protocol, trailing slashes, and `www.` prefix. Match `twitter.com` and `x.com` domains as equivalent.
- **Background sync without a job queue:** Cron-triggered API route only. For self-hosted Docker: user sets up system crontab. No built-in timer process.
- **Existing `Bookmark` model extension:** Adding nullable `source` and `externalId` fields is backward-compatible — all existing bookmarks will have `null` for both.
- **Prisma migration:** Non-breaking additive migration. No data loss or downtime.
- **Progress tracking for UI:** During initial import, the server action can update a `syncProgress` field (JSON: `{ total, imported }`) on `XIntegration` that the settings page polls via a lightweight API route or server action.

## Success Metrics

- Users can connect X account and see first bookmarks imported within 60 seconds
- Zero duplicate bookmarks after multiple sync cycles, including URL-based merge with manual bookmarks
- AI tags are applied to 90%+ of imported bookmarks (when LLM is configured)
- Manual "Sync Now" completes within 10 seconds for typical users (under sync cap)
- Disconnect flow preserves all previously imported bookmarks with no data loss
- Sync resumes correctly after mid-sync failures with no gaps or duplicates
- Auto-retry recovers from transient failures without user intervention

## Open Questions

- Does the X API v2 expose bookmark folder endpoints? Need to verify during implementation and implement the flat fallback if not.
- What is the exact per-tweet cost on X's pay-per-use model? Document this in README once confirmed.
- Should we add a "last synced" timestamp visible on the dashboard (not just settings page)?
- If X changes their API pricing or deprecates bookmark endpoints, how do we communicate this to users?
