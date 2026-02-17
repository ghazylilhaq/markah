# PRD: Mobile Usability Overhaul

## Introduction

Markah's UI was designed desktop-first, leaving mobile users with critical usability gaps: action buttons are invisible (hover-only), drag-and-drop doesn't work on touch devices, tag badges are unreadable at 10px, and the sidebar Sheet has interaction bugs. This overhaul makes the app fully functional and polished on mobile by fixing 17 identified issues across touch targets, layout, readability, and interaction patterns.

**Target device:** iPhone Safari (375px minimum width). Android Chrome is secondary.

## Goals

- Make all bookmark and folder actions accessible on mobile (currently blocked by hover-only visibility)
- Replace drag-and-drop folder assignment with a mobile-native "Move to Folder" menu
- Improve tag badge readability to meet WCAG AA contrast standards
- Fix sidebar Sheet bugs (scroll, premature close)
- Bring all interactive touch targets to minimum 44px (Apple HIG)
- Reduce wasted space and improve information density on small screens
- Maintain 4-5 visible bookmark cards per screen for balanced density

## User Stories

### US-001: Add three-dot overflow menu to bookmark cards
**Description:** As a mobile user, I want a visible overflow menu on each bookmark card so that I can access Share, Edit, Delete, and Move to Folder actions without hover.

**Acceptance Criteria:**
- [ ] Three-dot (`MoreVertical`) icon button always visible on each bookmark card (grid and list view) below `md:` breakpoint
- [ ] Touch target for the three-dot button is at least 44x44px
- [ ] Tapping the overflow opens a `DropdownMenu` with items in this order: Edit, Move to Folder, Share, Delete (destructive style with red text)
- [ ] Each dropdown item has a lucide icon and label
- [ ] Dropdown menu items have min 44px row height for touch targets
- [ ] On desktop (`md:` and above), existing hover-reveal individual buttons (Share, Edit, Delete) remain unchanged — overflow menu is hidden
- [ ] Below `md:`, hover-reveal buttons are hidden and replaced by the overflow menu
- [ ] Favorite (star) button remains directly on the card at all breakpoints — it is NOT moved into the overflow menu
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Add "Move to Folder" dialog
**Description:** As a mobile user, I want a "Move to Folder" option so I can organize bookmarks without drag-and-drop.

**Acceptance Criteria:**
- [ ] "Move to Folder" item in the overflow menu opens a `Dialog` listing all folders as an indented tree
- [ ] Reuse the existing folder tree structure from sidebar (`buildFolderTree()` output)
- [ ] Current folder is visually indicated with a checkmark icon
- [ ] Tapping a folder immediately moves the bookmark (no confirm button) via the existing `moveBookmarkToFolder` server action, then closes the dialog
- [ ] An "Unsorted" option at the top removes the bookmark from all folders
- [ ] Dialog content is scrollable if folder list is long (`overflow-y-auto max-h-[60dvh]`)
- [ ] Toast confirmation on successful move (e.g., "Moved to Work")
- [ ] Folder rows have min 44px height for touch targets
- [ ] The dialog is also accessible on desktop (available in both overflow menu and as a potential future desktop context menu item)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Disable drag-and-drop on mobile
**Description:** As a mobile user, I should not experience accidental drag gestures since folder assignment is handled via the Move to Folder dialog.

**Acceptance Criteria:**
- [ ] Create a `useMediaQuery` hook using `window.matchMedia('(min-width: 768px)')` with `useSyncExternalStore` (per project convention — no `setState` in `useEffect`)
- [ ] DndContext sensors are conditionally set: full sensors above `md:`, empty array below `md:`
- [ ] Drag overlay and drop indicators do not appear on mobile
- [ ] Folder drop zones in sidebar are inactive on mobile
- [ ] Desktop drag-and-drop continues to work exactly as before
- [ ] Typecheck/lint passes

### US-004: Improve tag badge readability
**Description:** As a user, I want tag badges to be readable on all screen sizes, especially mobile.

**Acceptance Criteria:**
- [ ] Tag text size increased from `text-[10px]` to `text-xs` (12px) on bookmark cards (both grid and list view)
- [ ] `tagToColor` function adjusted: text color lightness changed to 35% (from 50%), background hex opacity changed to `30` (from `20`), border hex opacity changed to `50` (from `40`)
- [ ] All tag color combinations pass WCAG AA contrast ratio (4.5:1) against their tinted background
- [ ] Edit dialog tag badges use the same updated color scheme
- [ ] Share page tag badges use the same updated color scheme
- [ ] Changes are made in the shared `tagToColor` utility so all tag displays update consistently
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Fix sidebar Sheet scroll and click behavior
**Description:** As a mobile user, I want the sidebar Sheet to scroll properly and not close when I interact with folders.

**Acceptance Criteria:**
- [ ] Sheet sidebar content wrapped in a container with `overflow-y-auto` and a proper height constraint (e.g., `max-h-[calc(100dvh-4rem)]`)
- [ ] Remove the blanket `onClick={() => setOpen(false)}` wrapper div in `dashboard-shell.tsx`
- [ ] Instead, pass a callback (e.g., `onNavigate`) to Sidebar that calls `setOpen(false)` — triggered only when user clicks a folder name to navigate
- [ ] Clicking folder expand/collapse chevrons does NOT close the Sheet
- [ ] Clicking "New Folder" button does NOT close the Sheet
- [ ] Rename input interaction does NOT close the Sheet
- [ ] Navigating to a folder (clicking folder name) DOES close the Sheet
- [ ] Sheet continues to open from the left side (no direction change)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Make folder context menu accessible on mobile
**Description:** As a mobile user, I want to access folder actions (Rename, Delete, Share, New Subfolder) without hover.

**Acceptance Criteria:**
- [ ] Folder context menu trigger (`MoreHorizontal` button) always visible below `md:` breakpoint (remove `opacity-0 group-hover:opacity-100` conditionally)
- [ ] On desktop (`md:` and above), hover-reveal behavior remains unchanged
- [ ] Touch target for the trigger is at least 44x44px on mobile (use padding/min-size, keep icon at `h-3.5 w-3.5`)
- [ ] Dropdown menu items have min 44px row height for comfortable tapping
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-007: Increase touch targets across the app
**Description:** As a mobile user, I want all interactive elements to be easy to tap accurately.

**Acceptance Criteria:**
- [ ] Tag filter bar: horizontal scroll with `overflow-x-auto` in a single row, fade edges via `mask-image` gradient, buttons increased to min 44px tap target height (increase vertical padding)
- [ ] Search bar clear button (`X`): increase from `h-6 w-6` to min 44x44px tap area (can use padding without increasing visual size)
- [ ] View toggle buttons (grid/list): increase from `size-8` to min 44x44px on mobile
- [ ] Favorite star button on cards: increase from `p-0.5` to min 44x44px tap area
- [ ] Edit dialog tag remove (`X`) button: increase from `p-0.5 h-3 w-3` to min 44x44px tap area
- [ ] All changes should use invisible padding (larger tap area, same visual size) where possible to avoid layout bloat
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-008: Show metadata in list view on mobile
**Description:** As a mobile user viewing bookmarks in list mode, I want to see at least the domain and some tags, not just the title.

**Acceptance Criteria:**
- [ ] Both grid and list view remain available on mobile (keep the toggle)
- [ ] Domain is visible on mobile: remove `hidden sm:inline`, show below the title in a stacked layout on small screens
- [ ] Tags are visible on mobile: remove `hidden md:flex`, show 1-2 tags below the domain on small screens (truncate excess with "+N more")
- [ ] Below `sm:` breakpoint, list item layout stacks vertically: title on first line, domain + tags on second line
- [ ] Above `sm:`, layout reverts to the current horizontal row
- [ ] Visit count and date remain hidden on mobile (`hidden lg:inline` unchanged)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-009: Reduce mobile padding and spacing
**Description:** As a mobile user, I want screen space used efficiently without excessive padding.

**Acceptance Criteria:**
- [ ] Main content area in `dashboard-shell.tsx`: change `p-6` to `p-3 md:p-6`
- [ ] Landing page hero section: change `pt-24` to `pt-12 md:pt-24`
- [ ] Landing page feature grid: change `py-20` to `py-10 md:py-20`
- [ ] Share page breadcrumb: add `truncate` and `max-w-[200px]` to folder name span to prevent overflow on narrow screens
- [ ] Verify 4-5 bookmark cards are visible per screen on a 375px / 667px viewport
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-010: Make Quick Add Bar mobile-friendly
**Description:** As a mobile user, I want the bookmark quick-add form to be usable on narrow screens and always accessible.

**Acceptance Criteria:**
- [ ] Quick Add Bar is sticky at the top of the content area when scrolling (`sticky top-0 z-10` with background)
- [ ] Button shows only the `+` icon below `sm:` breakpoint (hide "Save" / "Saving..." text)
- [ ] Input field retains adequate width on 375px screens (minimum ~250px usable input width)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-011: Make edit dialog full-screen on mobile
**Description:** As a mobile user, I want the edit dialog to use the full screen so form fields are spacious and unaffected by the on-screen keyboard.

**Acceptance Criteria:**
- [ ] Below `md:` breakpoint, the edit bookmark dialog renders as a full-screen overlay (use shadcn `DialogContent` with `max-w-full h-full max-h-full rounded-none` on mobile, or a conditional `Sheet` with `side="bottom"`)
- [ ] Close button (X) clearly visible in top-right corner
- [ ] Form content scrollable within the full-screen dialog
- [ ] Above `md:`, dialog remains the current centered modal (`sm:max-w-lg max-h-[85vh]`)
- [ ] Replace `max-h-[85vh]` with `max-h-[85dvh]` for the desktop dialog variant (iOS keyboard fix)
- [ ] Tag suggestion dropdown renders inside the scrollable area (not absolutely positioned outside) to avoid clipping
- [ ] Dialog remains usable when iOS keyboard is open
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-012: Add loading spinner for mobile
**Description:** As a mobile user on a slower connection, I want clear feedback that content is loading.

**Acceptance Criteria:**
- [ ] Show a centered `Loader2` spinner (from lucide, with `animate-spin`) when bookmarks are loading
- [ ] Spinner appears in the main content area (not blocking the Quick Add Bar)
- [ ] Typecheck/lint passes

## Recommended Build Sequence

Stories should be implemented in this order due to dependencies and risk:

**Phase 1 — Critical blockers (must-fix for basic mobile functionality):**
1. **US-005** — Fix sidebar Sheet first (foundational — other sidebar work depends on it)
2. **US-001** — Overflow menu on cards (unlocks all card actions on mobile)
3. **US-002** — Move to Folder dialog (depends on US-001 overflow menu existing)
4. **US-003** — Disable drag-and-drop on mobile (depends on US-002 providing the alternative)

**Phase 2 — Readability and touch targets:**
5. **US-004** — Tag badge readability (global change, low risk)
6. **US-006** — Folder context menu on mobile (similar pattern to US-001)
7. **US-007** — Touch targets across the app (sweep of small changes)

**Phase 3 — Layout and polish:**
8. **US-009** — Padding and spacing (quick wins)
9. **US-008** — List view metadata on mobile
10. **US-010** — Quick Add Bar sticky + icon-only
11. **US-011** — Edit dialog full-screen on mobile
12. **US-012** — Loading spinner

## Functional Requirements

- FR-1: Three-dot `DropdownMenu` overflow on bookmark cards below `md:`, containing Edit, Move to Folder, Share, and Delete — with min 44px row height
- FR-2: "Move to Folder" `Dialog` showing indented folder tree with checkmark on current folder, immediate move on tap, "Unsorted" option, toast confirmation
- FR-3: Drag-and-drop disabled below `md:` breakpoint via `useMediaQuery` hook using `useSyncExternalStore`
- FR-4: Tag badge text at minimum 12px (`text-xs`), colors at 35% lightness meeting WCAG AA 4.5:1 contrast
- FR-5: Sidebar Sheet scroll container with `overflow-y-auto` and `dvh`-based height constraint
- FR-6: Sheet closes only on folder navigation via `onNavigate` callback, not on internal interactions
- FR-7: Folder context menu trigger always visible below `md:`, hover-reveal on desktop
- FR-8: All interactive elements have minimum 44x44px touch target on mobile (use invisible padding where possible)
- FR-9: List view stacks title/domain/tags vertically below `sm:`, horizontal row above
- FR-10: Responsive padding: `p-3` on mobile, `p-6` on desktop
- FR-11: Quick Add Bar sticky at top, icon-only button below `sm:`
- FR-12: Edit dialog full-screen below `md:`, centered modal with `dvh` above `md:`
- FR-13: Tag filter bar as horizontal-scrolling single row with fade edges
- FR-14: Favorite (star) button remains directly on card at all breakpoints
- FR-15: Centered loading spinner while bookmarks load

## Non-Goals

- No native app or PWA conversion
- No mobile-specific navigation paradigm (bottom tabs, etc.) — keep existing left-side Sheet sidebar
- No swipe gestures (swipe-to-delete, swipe-to-share)
- No haptic feedback (deferred to a future iteration)
- No mobile-specific features (native OS share sheet, etc.)
- No changes to desktop layout or behavior (all changes are additive for mobile or use responsive breakpoints)
- No full accessibility overhaul (screen reader, focus management) — only WCAG AA contrast for tag badges
- No share page redesign — only minimal fixes (breadcrumb overflow, tag readability)
- No multi-select bookmark move (deferred to a future iteration)

## Design Considerations

- **Breakpoint:** Use `md:` (768px) as the mobile/desktop boundary, consistent with existing Tailwind usage
- **Minimum width:** 375px (iPhone SE / 13 mini). Do not optimize for 320px.
- **Density:** Target 4-5 bookmark cards visible per screen on 375x667px viewport
- **Components:** Reuse existing shadcn/ui: `DropdownMenu` for overflow, `Dialog` for Move to Folder, `Sheet` for sidebar
- **Overflow icon:** `MoreVertical` from lucide (vertical dots, standard mobile pattern)
- **Move to Folder tree:** Reuse `buildFolderTree()` output from dashboard layout — render as indented list with folder icons
- **Tag colors:** Adjust globally in `tagToColor` utility so all tag displays (cards, list items, edit dialog, share page) update consistently
- **Touch targets:** Prefer invisible padding (larger tap area, same visual footprint) over visually enlarging buttons
- **Tag filter bar:** Single horizontal-scrolling row with CSS `mask-image` fade on edges to indicate scrollability

## Technical Considerations

- **`useMediaQuery` hook:** Create using `window.matchMedia('(min-width: 768px)')` with `useSyncExternalStore` (project convention — no `setState` in `useEffect`). Reuse across US-001, US-003, US-006, US-011.
- **`dvh` units:** Good browser support (iOS 15.4+, Chrome 108+). Use for Sheet height and dialog max-height. Primary target is iPhone Safari where `vh` is broken with keyboard.
- **Move to Folder data flow:** The folder list is already passed to `DashboardShell` as props. Thread it down to the overflow menu's Move to Folder dialog. No new server action needed — reuse `moveBookmarkToFolder`.
- **Sheet close fix:** Remove wrapper `onClick`, pass `onNavigate={() => setOpen(false)}` callback prop to Sidebar. Sidebar calls it in the folder name click handler only.
- **Conditional rendering pattern:** For mobile/desktop UI differences, prefer CSS `md:hidden` / `hidden md:flex` over JS conditional rendering — avoids hydration mismatches and is simpler. Use JS (`useMediaQuery`) only where behavior differs (drag-and-drop sensors, dialog vs full-screen).
- **Tag filter horizontal scroll:** Use `overflow-x-auto whitespace-nowrap` on the container, `inline-flex` on children. Fade edges via `mask-image: linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)`.

## Testing Strategy

- **Primary target:** iPhone Safari on 375px viewport (use Chrome DevTools device emulation + Safari on real device)
- **Secondary:** Android Chrome on 375px viewport
- **Key scenarios to manually test:**
  1. Open overflow menu, tap each action (Edit, Move, Share, Delete)
  2. Move a bookmark to a folder, verify toast and bookmark relocation
  3. Open sidebar Sheet, expand folders, create subfolder, rename — verify Sheet stays open
  4. Navigate to a folder from Sheet — verify Sheet closes
  5. Read tag badges on cards without zooming
  6. Tap all small buttons (star, clear search, tag filter, view toggle) — verify no mis-taps
  7. Edit a bookmark — verify full-screen dialog, type in fields with keyboard open
  8. Scroll bookmark list — verify Quick Add Bar stays sticky
  9. Switch between grid and list view — verify metadata visible in both

## Success Metrics

- All bookmark and folder actions accessible via touch (zero hover-dependent interactions on mobile)
- Tag badges readable without zooming on a 375px-wide screen
- All touch targets pass 44px minimum (audit with Chrome DevTools tap highlight)
- Sidebar Sheet usable for multi-step interactions (expand folder, create subfolder) without premature closing
- 4-5 bookmark cards visible per screen on 375x667px
- No regressions to desktop experience

## Open Questions

- Should "Move to Folder" support creating a new folder inline (without going to sidebar)? Deferring for now — user can create folders from sidebar first.
- Should the tag filter horizontal scroll show left/right arrow buttons for discoverability, or is the fade edge sufficient?
