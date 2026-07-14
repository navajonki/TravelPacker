# TravelPacker — Navigation Structure & Screenshot Manifest

**Target:** https://travelpacker-production.up.railway.app
**Captured:** headless Chromium (Playwright), logged in as `zjbodnar@gmail.com`, in two profiles:
- **desktop** — 1440×900 → `desktop/*.png` (21 shots)
- **mobile** — 390×844, `isMobile`/touch, iOS UA → `mobile/*.png` (20 shots)
**Router:** `wouter` (`client/src/App.tsx`), client-side. All data via `/api/*`; realtime via WebSocket.

> Access note: the deployment sits behind the Claude Code egress proxy, which resets
> Chromium's tunneled TLS. Screenshots were captured by routing Chromium through a small
> local MITM relay (`tooling/relay.js`) that re-issues each request via Node `fetch()`
> (which the proxy accepts). See `tooling/README-approach.md` — or just use the
> `web-screenshots` skill, which packages the whole flow.

## Route map

```
/                         Dashboard            [protected]  → list of packing lists
/list/:id                 PackingList          [protected]  → the core app screen
/list/:id/unassigned      UnassignedItemsTest  [protected]  → unassigned-items debug view
/auth                     AuthPage             [public]     → login / register (redirects to / if authed)
/forgot-password          ForgotPasswordPage   [public]     → request reset email
/reset-password           ResetPasswordPage    [public]     → set new password (needs ?token=)
/invitation/:token        InvitationPage       [public]     → accept a collaboration invite
*  (any other path)       NotFound             [public]     → 404
```

Protected routes use `ProtectedRoute`: an unauthenticated visitor is redirected to `/auth`.
On successful auth the app redirects to `/`.

## Navigation flow

```
                        ┌─────────────── /auth ───────────────┐
   (unauthenticated)    │  Login tab  ──login──▶  /            │
        │               │  Register tab ──register──▶ /        │
        ▼               │  "Forgot your password?" ▶ /forgot-password
   ProtectedRoute ──────┘                                      │
        │  (authenticated)                                     ▼
        ▼                                          /reset-password?token=…
   /  Dashboard ─────────────────────────────────────────────────────────
        │   ▲                                                             │
        │   │ "Back to Lists" (Header)                                    │
        │   │                                                            copy → new /list/:id
   click a list card ──▶ /list/:id  (PackingList)                        │
        │                    │                                           │
        │                    ├─ Tabs: By Category · By Bag · By Traveler · Filters
        │                    ├─ Toolbar: Add Item (inline QuickAdd → Advanced Add modal),
        │                    │           Edit Multiple (bulk-select mode), Search
        │                    ├─ Top-right: Share (slide-over), Export (CSV download)
        │                    ├─ Header "⋯" menu: Share · Export · Edit List · Delete List
        │                    ├─ "Add New Category / Bag / Traveler" cards → Add* modals
        │                    └─ Row/edit modals: Edit Item · Edit Category/Bag/Traveler
        │
   New List (button) ──▶ CreateListModal ──create──▶ /list/:id
   Delete (card) ──────▶ AlertDialog (confirm) ─────▶ removes list
```

## Persistent chrome

- **Header** (`components/Header.tsx`): TravelPack logo (→ `/`), "Back to Lists" on list pages,
  the "⋯" actions menu (list pages only), and the user avatar menu (logout).
- **PackingListHeader**: list title, online/offline + sync status, progress bar, and the
  four view tabs. On mobile, `MobileNav` mirrors the tabs.
- **SyncStatusIndicator** ("All changes saved" pill, bottom-right) is global.

## Screenshot manifest

Both profiles capture the same route/state set, under `desktop/` and `mobile/`. The one
difference: the **Share** modal (`17-list-share-modal`) exists only on desktop — its
top-right button is hidden on mobile, where Share lives inside the header ⋯ menu. Mobile
numbering is therefore shifted by one from that point (header-menu = 17, edit = 18, etc.).

| State (route · page) | desktop | mobile |
|---|---|---|
| Login tab · `/auth` | `desktop/01-auth-login.png` | `mobile/01-auth-login.png` |
| Register tab · `/auth` | `desktop/02-auth-register.png` | `mobile/02-auth-register.png` |
| Forgot password · `/forgot-password` | `desktop/03-forgot-password.png` | `mobile/03-forgot-password.png` |
| Reset password · `/reset-password` | `desktop/04-reset-password.png` | `mobile/04-reset-password.png` |
| Invitation · `/invitation/:token` | `desktop/05-invitation.png` | `mobile/05-invitation.png` |
| 404 · `*` | `desktop/06-not-found.png` | `mobile/06-not-found.png` |
| Dashboard · `/` | `desktop/07-dashboard.png` | `mobile/07-dashboard.png` |
| Create List modal · `/` | `desktop/08-dashboard-create-modal.png` | `mobile/08-dashboard-create-modal.png` |
| Delete dialog · `/` | `desktop/09-dashboard-delete-dialog.png` | `mobile/09-dashboard-delete-dialog.png` |
| By Category · `/list/:id` | `desktop/10-list-category.png` | `mobile/10-list-category.png` |
| By Bag · `/list/:id` | `desktop/11-list-bag.png` | `mobile/11-list-bag.png` |
| By Traveler · `/list/:id` | `desktop/12-list-traveler.png` | `mobile/12-list-traveler.png` |
| Filters · `/list/:id` | `desktop/13-list-filters.png` | `mobile/13-list-filters.png` |
| Group-By open · `/list/:id` | `desktop/14-list-filters-groupby.png` | `mobile/14-list-filters-groupby.png` |
| Quick Add · `/list/:id` | `desktop/15-list-quick-add.png` | `mobile/15-list-quick-add.png` |
| Add Category modal · `/list/:id` | `desktop/16-list-add-category-modal.png` | `mobile/16-list-add-category-modal.png` |
| Share modal · `/list/:id` | `desktop/17-list-share-modal.png` | _(in ⋯ menu on mobile)_ |
| Header ⋯ menu · `/list/:id` | `desktop/18-list-header-menu.png` | `mobile/17-list-header-menu.png` |
| Edit List modal · `/list/:id` | `desktop/19-list-edit-modal.png` | `mobile/18-list-edit-modal.png` |
| Bulk-edit mode · `/list/:id` | `desktop/20-list-multi-edit.png` | `mobile/19-list-multi-edit.png` |
| Unassigned · `/list/:id/unassigned` | `desktop/21-list-unassigned.png` | `mobile/20-list-unassigned.png` |

Machine-readable version: `manifest.json` — one entry per shot with `profile`, `viewport`,
`route`, `page`, `state`, `description`, and resolved `url`.

## Design-system notes (observed)

- **Stack:** React + Tailwind + shadcn/ui (Radix primitives) — Tabs, Dialog, AlertDialog,
  DropdownMenu, Select, Switch, Progress, Card, Button.
- **Palette:** blue primary (`#2563eb`-ish), white surfaces, gray borders, red destructive,
  green "packed"/traveler tags, blue bag tags. Strikethrough text = packed items.
- **Layout:** responsive 1/2/3-column card grids; sticky header; slide-over sheet for Share;
  centered dialogs for create/edit; bottom-right global save indicator.
