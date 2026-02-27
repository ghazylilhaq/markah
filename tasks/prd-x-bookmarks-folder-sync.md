# PRD: X.com Bookmark Folder Sync

## Introduction

Enhance the existing X.com bookmark sync feature so that X bookmark collections
(folders on X) are mirrored as subfolders inside the "X Bookmarks" folder in
Markah. Currently all synced bookmarks land in a flat "X Bookmarks" folder
regardless of their collection on X. This PRD describes a one-way sync
(X → Markah) that maps X collections to Markah subfolders, runs on a daily
background schedule, and surfaces sync status in the settings page.

## Goals

- Mirror X bookmark collections as subfolders under "X Bookmarks" in Markah
- Assign each synced bookmark to its matching subfolder automatically
- Bookmarks not in any X collection stay in the top-level "X Bookmarks" folder
- Gracefully fall back to current behavior when X API doesn't expose collections,
  and surface a one-time settings note informing the user
- Keep sync idempotent: re-running sync corrects folder assignments
- Run sync automatically once per day for connected users; expose last-sync
  status and sync errors in the settings page
- Distinguish X-managed folders visually with an X logo badge in the sidebar

## User Stories

### US-001: Fetch X bookmark collections from API
**Description:** As a developer, I need to retrieve a user's X bookmark collections
from the X API so that I can mirror them as folders in Markah.

**Acceptance Criteria:**
- [ ] `fetchXBookmarkFolders(accessToken, xUserId)` in `lib/services/x-bookmarks.ts`
      calls `GET /2/users/:id/bookmarks/folders` (or current equivalent endpoint)
- [ ] Returns an array of `{ id: string, name: string }` objects
- [ ] Returns empty array (no crash) when endpoint is unavailable or returns 404
- [ ] When the endpoint returns 404/403 (API tier restriction), sets a
      `xCollectionsUnavailable: true` flag so the caller can surface a settings note
- [ ] Typecheck/lint passes

### US-002: Fetch bookmark-to-collection mapping from X API
**Description:** As a developer, I need to know which bookmarks belong to which
X collection so I can assign them to the correct Markah subfolder.

**Acceptance Criteria:**
- [ ] `fetchXBookmarksInFolder(accessToken, xUserId, folderId)` in
      `lib/services/x-bookmarks.ts` fetches tweet IDs belonging to a given X collection
- [ ] Returns array of tweet IDs (strings)
- [ ] Handles pagination if a collection has >100 bookmarks
- [ ] Retries up to 3 times with exponential backoff (1s, 2s, 4s) on HTTP 429 (rate limit)
- [ ] Returns empty array gracefully if all retries are exhausted; marks collection
      as unsynced for the partial-sync record
- [ ] Typecheck/lint passes

### US-003: Create Markah subfolders for X collections
**Description:** As a developer, I need the sync process to create (or reuse existing)
Markah subfolders that correspond to X collections, handling name conflicts with
user-created folders.

**Acceptance Criteria:**
- [ ] `getOrCreateXCollectionFolder(userId, collection, xBookmarksFolderId)` helper
      in `lib/services/x-sync-core.ts` first looks up by `xCollectionId` (stored on
      the `Folder` record); if not found, creates a new folder
- [ ] If a user-created folder with the same name already exists under "X Bookmarks",
      the new X-mirrored folder is created with a `" (X)"` suffix
      (e.g. `"Reading List (X)"`) to avoid collision
- [ ] Calling it twice with the same `xCollectionId` returns the same folder (idempotent)
- [ ] Does NOT create duplicate folders on repeated syncs
- [ ] Created folder has `xCollectionId` field set and `isSyncManaged: true`
- [ ] Typecheck/lint passes

### US-004: Assign synced bookmarks to their X collection subfolder
**Description:** As a user, I want bookmarks that belong to an X collection to
appear in the matching Markah subfolder so my X organization is reflected in Markah.

**Acceptance Criteria:**
- [ ] During `syncXBookmarksForUser()`, after fetching collections, each imported
      bookmark is placed into its X collection subfolder (via `BookmarkFolder` join)
- [ ] A bookmark belonging to no X collection is placed only in "X Bookmarks" root
      (existing behavior preserved)
- [ ] A bookmark moved to a different collection on X is re-assigned on next sync:
      only the `BookmarkFolder` row pointing to an X-managed folder is removed/updated;
      user-created folder memberships for the same bookmark are untouched
- [ ] Typecheck/lint passes

### US-005: Graceful fallback when X API has no collections support
**Description:** As a user, I want the sync to still work even if X API doesn't
expose bookmark collections, so my sync doesn't break.

**Acceptance Criteria:**
- [ ] If `fetchXBookmarkFolders()` returns empty array due to API tier restriction,
      sync proceeds normally (all bookmarks go to "X Bookmarks" folder as today)
- [ ] A `xCollectionsNote` flag is set on the sync result when the endpoint
      was gated/unavailable (distinct from a network error)
- [ ] The settings page displays a one-time note:
      "X bookmark collections sync requires a higher X API tier. Bookmarks are
      still syncing to the X Bookmarks folder."
- [ ] No error toast is thrown during this fallback
- [ ] Sync result toast still shows correct imported/merged/skipped counts
- [ ] Typecheck/lint passes

### US-006: Daily background sync for connected users
**Description:** As a user, I want my X bookmarks (including collections) to stay
up to date automatically without manually triggering a sync each time.

**Acceptance Criteria:**
- [ ] A background job (cron or equivalent) runs `syncXBookmarksForUser()` once
      per day for every user with a valid stored X OAuth token
- [ ] Background syncs do NOT fire a toast on completion — they are silent
- [ ] If a background sync fails, the error is recorded in the sync status record
      (visible on the settings page) but no notification is pushed to the user
- [ ] Manual sync continues to trigger a toast on completion/failure as before
- [ ] Typecheck/lint passes

### US-007: Sync status and API tier note in settings
**Description:** As a user, I want to see when my X bookmarks last synced and
whether there were any issues, so I can troubleshoot without guessing.

**Acceptance Criteria:**
- [ ] The X integration settings panel shows:
      - Last sync timestamp (e.g. "Last synced 3 hours ago")
      - Sync status: success, partial, or error
      - If partial: "Some collections could not be fetched (rate limit). Will retry next sync."
      - If `xCollectionsNote` was set: API tier note (see US-005)
- [ ] Status is stored in the database and survives page refresh
- [ ] "Sync now" button still triggers manual sync with a toast
- [ ] Typecheck/lint passes

### US-008: X badge on sync-managed folders
**Description:** As a user, I want to visually distinguish X-managed folders from
my own folders in the sidebar so I understand which folders are controlled by sync.

**Acceptance Criteria:**
- [ ] Both the "X Bookmarks" parent folder and all X collection subfolders display
      a small X logo badge in the sidebar folder list
- [ ] Badge is rendered via a component that reads `isSyncManaged` or `source === 'x'`
      from the folder data passed to the sidebar
- [ ] The badge has a tooltip: "Synced from X — edits may be overwritten on next sync"
- [ ] Renaming an X-managed folder from the Markah UI shows a warning:
      "This folder is managed by X sync and will be renamed back on the next sync."
      (user can still proceed)
- [ ] Typecheck/lint passes

### US-009: Disconnect X integration
**Description:** As a user, I want to disconnect my X account from Markah and
choose what happens to my synced folders.

**Acceptance Criteria:**
- [ ] Settings page has a "Disconnect X" button
- [ ] On disconnect, all X-managed folders (parent + subfolders) are converted to
      regular Markah folders: `isSyncManaged` set to `false`, `xCollectionId` cleared
- [ ] Bookmarks remain in those folders after disconnect
- [ ] After disconnect, scheduled sync no longer runs for that user
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: Implement `fetchXBookmarkFolders(accessToken, xUserId)` in
  `lib/services/x-bookmarks.ts`. Return `{ folders: XCollection[], unavailable: boolean }`.
- FR-2: Implement `fetchXBookmarksInFolder(accessToken, xUserId, folderId)` in
  `lib/services/x-bookmarks.ts` with pagination and retry-with-backoff (3 retries,
  exponential: 1s / 2s / 4s) on HTTP 429.
- FR-3: Add `getOrCreateXCollectionFolder(userId, collection, parentFolderId)` in
  `lib/services/x-sync-core.ts`. Look up by `xCollectionId` first; fall back to
  name match only for migration from pre-schema-change installs. Append `" (X)"` to
  name if a user-created folder with the same name exists at the same parent.
- FR-4: In `syncXBookmarksForUser()` in `lib/services/x-sync-core.ts`:
  1. Fetch all X bookmarks (existing logic)
  2. Fetch all X collections — handle `unavailable` flag
  3. For each collection, fetch its bookmark IDs with retry backoff
  4. Build `tweetId → xCollectionFolderId` lookup map
  5. Process bookmarks as before, using the map to assign folders
  6. For each bookmark, update only X-managed `BookmarkFolder` rows on reassignment
  7. Persist sync result (timestamp, status, partial flag, collections note) to DB
- FR-5: If a previously synced bookmark's X collection assignment changes, remove
  only the `BookmarkFolder` row pointing to an X-managed subfolder, then add the
  new row. User-created `BookmarkFolder` rows for the same bookmark are preserved.
- FR-6: Sync must remain idempotent — running it multiple times produces the same
  folder structure with no duplicates.
- FR-7: Implement a daily background sync job that iterates over users with a stored
  X OAuth token and calls `syncXBookmarksForUser()`. Silent on success; records
  errors to sync status DB record.
- FR-8: Add `isSyncManaged` (boolean) and `xCollectionId` (string, nullable) fields
  to the `Folder` model in Prisma schema to support badge rendering, idempotent
  lookup, and disconnect behavior.
- FR-9: Add a `XSyncStatus` model (or `xSyncStatus` JSON field on User) to store:
  `lastSyncedAt`, `status` (success | partial | error), `errorMessage`, `collectionsNote`.
- FR-10: Sidebar renders an X badge (`<XBadge />`) on any folder where
  `isSyncManaged === true`. Badge tooltip: "Synced from X — edits may be overwritten
  on next sync."
- FR-11: "Disconnect X" action in settings calls a server action that revokes the
  stored token and sets `isSyncManaged = false` / clears `xCollectionId` on all
  X-managed folders for that user.

## Non-Goals

- No bidirectional sync (Markah folders do NOT sync back to X)
- No UI to manage X collection-to-folder mapping (automatic only)
- No deletion of Markah folders when a collection is deleted on X
  (orphaned folders remain as regular Markah folders; user can delete manually)
- No support for bookmarks belonging to multiple X collections simultaneously
  (X does not support this)
- No per-collection sync toggle (all collections sync or none)
- No conflict resolution UI for name clashes — the `" (X)"` suffix is applied automatically

## Technical Considerations

### Schema Changes Required
Two new fields on `Folder`:
```prisma
model Folder {
  // ... existing fields ...
  isSyncManaged  Boolean  @default(false)
  xCollectionId  String?  // X collection ID, null for user-created folders
}
```
New model for sync status per user:
```prisma
model XSyncStatus {
  id               String    @id @default(cuid())
  userId           String    @unique
  lastSyncedAt     DateTime?
  status           String?   // "success" | "partial" | "error"
  errorMessage     String?
  collectionsNote  Boolean   @default(false)
  user             User      @relation(fields: [userId], references: [id])
}
```

### Key Files to Modify
- `prisma/schema.prisma` — add `isSyncManaged`, `xCollectionId` to `Folder`;
  add `XSyncStatus` model
- `prisma/migrations/` — migration for schema changes above
- `lib/services/x-bookmarks.ts` — implement `fetchXBookmarkFolders()` and
  `fetchXBookmarksInFolder()` with pagination and retry backoff
- `lib/services/x-sync-core.ts` — update `syncXBookmarksForUser()` to use
  collection data; add `getOrCreateXCollectionFolder()` helper; persist sync status
- `lib/actions/x-sync.ts` — add `disconnectXIntegration()` server action
- `components/sidebar.tsx` — render X badge on folders with `isSyncManaged: true`
- `components/x-badge.tsx` — new badge component with tooltip
- `app/dashboard/settings/` — display sync status, collections note, disconnect button
- Background job file (e.g. `lib/jobs/x-sync-daily.ts`) — daily cron runner

### X API Details
- Bookmark folders endpoint: `GET /2/users/:id/bookmarks/folders`
  (requires OAuth 2.0 with `bookmark.read` scope, already granted)
- Bookmarks-in-folder: `GET /2/users/:id/bookmarks?bookmark_folder_id={id}`
  (same endpoint with a filter parameter; paginates via `next_token`)
- HTTP 404 or 403 on the folders endpoint → treat as `unavailable: true`, set
  `collectionsNote` in sync status
- HTTP 429 → retry with exponential backoff (1s, 2s, 4s); after 3 failures,
  record collection as unsynced, commit partial results, continue with remaining

### Rate Limit Strategy
```
for each collection:
  attempt = 0
  while attempt < 3:
    result = fetchXBookmarksInFolder(...)
    if success: break
    if 429: wait(2^attempt seconds), attempt++
  if all retries failed:
    mark collection as "unsynced" in partial result
    continue to next collection
```
After all collections processed, if any were unsynced → set `status = "partial"` in
`XSyncStatus`.

### Sync Order
1. Fetch all X bookmarks (existing logic)
2. Fetch all X collections → handle `unavailable` flag
3. For each collection, fetch its bookmark IDs with retry backoff
4. Build `tweetId → collectionFolderId` lookup map
5. Ensure collection subfolders exist (`getOrCreateXCollectionFolder`)
6. Process bookmarks as before, using the map to assign folders
7. For each bookmark already in DB: update only X-managed `BookmarkFolder` rows
8. Persist `XSyncStatus` record

### Idempotency
- Look up existing X-managed folders by `xCollectionId`, not by name
- For `BookmarkFolder` reassignment: query `BookmarkFolder` rows for the bookmark
  where `folder.isSyncManaged = true`; replace only those rows
- User-created `BookmarkFolder` rows (folders where `isSyncManaged = false`) are
  never touched during sync

### Conflict: Same Name as User Folder
```
existing = findFolderByName(name, parentId, userId, isSyncManaged: false)
if existing:
  create folder with name = `${collectionName} (X)`
else:
  create folder with name = collectionName
```

### Disconnect Flow
1. Clear stored X OAuth token from DB
2. Set `isSyncManaged = false`, `xCollectionId = null` on all user's X-managed folders
3. Mark background job as inactive for this user
4. Folders and bookmarks remain intact as regular Markah data

### X Badge Component
```tsx
// components/x-badge.tsx
export function XBadge() {
  return (
    <Tooltip content="Synced from X — edits may be overwritten on next sync">
      <span className="inline-flex items-center">
        <XIcon className="h-3 w-3 text-muted-foreground" />
      </span>
    </Tooltip>
  )
}
```
Rendered in `FolderItem` when `folder.isSyncManaged === true`.

## Success Metrics

- After sync, a user with 3 X collections sees 3 subfolders under "X Bookmarks",
  each with an X badge
- Bookmarks appear in the correct subfolder matching their X collection
- Re-syncing does not create duplicate folders
- Users without X collections (or on a lower API tier) see no change in behavior,
  but do see the one-time settings note
- Daily background sync runs without user interaction and status is visible in settings
- Disconnecting X converts all sync-managed folders to regular folders with no data loss
- Rate limit mid-sync results in partial commit with a "partial" status badge in settings,
  not a failed sync or error toast

## Open Questions

- Does the X API expose `bookmark_folder_id` on individual bookmark objects in the
  main `/2/users/:id/bookmarks` response, or must we make a separate call per
  collection to fetch membership? (Determines whether step 3 above can be avoided
  on the basic tier.)
- Should the `" (X)"` suffix be visible/editable by the user, or silently appended
  and hidden from the rename UI?
- For the daily background sync job: use Next.js route handler + Vercel Cron, or
  a separate worker process? (Depends on deployment target — Docker vs Vercel.)
