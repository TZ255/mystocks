# MANDATORY FOR ALL LLM AGENTS
After **every code or config change**, you must update this file before finishing your response.
Minimum required update:
1. Add/append a `Progress Log` entry with date, what changed, and why.
2. List touched files.
3. Mention validation performed (tests/checks/manual).
4. Note open issues or follow-up work.

If you changed behavior and did not update this file, the task is incomplete.

---

# HisaZangu Project Guide

## Project Summary
HisaZangu is a Node.js web app for tracking Dar es Salaam Stock Exchange (DSE) investments.

Core capabilities:
- Google OAuth login
- Live and historical DSE data sync
- Portfolio tracking (buy/sell holdings)
- Watchlist
- Price alerts
- HTMX-driven partial updates for app-like interactions

## Tech Stack
- Runtime: Node.js (ESM modules)
- Web: Express 5
- Views: EJS + express-ejs-layouts
- DB: MongoDB + Mongoose
- Auth: Passport + Google OAuth2
- Sessions: express-session + connect-mongo
- UI: Bootstrap 5 + custom CSS
- Dynamic UI: HTMX
- Charts: Chart.js
- Jobs: node-cron

## Entry Points
- Server bootstrap: `server.js`
- Express app setup: `app.js`
- Mongo connection: `config/db.js`
- Session config: `config/session.js`
- Passport config: `config/passport.js`

## Environment Variables
See `.env.example` for required keys:
- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `SESSION_SECRET`

## Run Locally
1. Install deps:
   - `npm install`
2. Configure env:
   - copy `.env.example` -> `.env`
3. Start dev server:
   - `npm run dev`
4. Start prod mode:
   - `npm start`

## High-Level Architecture

### Backend
- Page routes:
  - `routes/index.js`
  - `routes/auth.js`
  - `routes/dashboard.js`
  - `routes/stocks.js`
  - `routes/portfolio.js`
  - `routes/watchlist.js`
  - `routes/alerts.js`
- HTMX/API routes:
  - `routes/api.js`

### Models
- `models/User.js`
- `models/Stock.js`
- `models/StockHistory.js`
- `models/Portfolio.js`
- `models/Watchlist.js`
- `models/Alert.js`

### Services / Jobs
- DSE fetch + upsert:
  - `services/dseService.js`
- Alert trigger checks:
  - `services/alertService.js`
- Portfolio math + tx aggregation:
  - `services/portfolioService.js`
- Cron scheduler:
  - `jobs/stockFetcher.js`

### Frontend
- Main layout:
  - `views/layout.ejs`
- Navigation:
  - `views/partials/nav.ejs`
- Pages:
  - `views/pages/*`
- HTMX fragments:
  - `views/fragments/*`
- Global JS:
  - `public/js/app.js`
- Chart/page JS:
  - `public/js/dashboard.js`
- Styles:
  - `public/css/theme.css`
  - `public/css/components.css`
  - `public/css/dashboard.css`
  - `public/css/landing.css`

## HTMX Conventions in This Project
- Mutating endpoints under `/api/*` are HTMX-protected via `verifyHtmx`.
- Most interactions return fragments (HTML partials), not JSON.
- Global request UX:
  - top progress indicator `#htmx-progress`
  - per-action indicators via `hx-indicator`
  - toast events via `HX-Trigger: showToast`
- Watchlist sync:
  - `HX-Trigger: watchlistChanged` keeps watch buttons/lists in sync.

## Mobile-First UX Rules
- Keep primary actions reachable with one hand.
- Show key financial values on mobile cards (including explicit P/L).
- Use HTMX indicators for all user-triggered requests.
- Avoid full-page reload when HTMX partial navigation is intended.
- Ensure active nav state updates after HTMX swaps/history navigation.

## Current Behavior Notes
- Portfolio sell-all no longer deletes record immediately; it can preserve transaction history by setting shares to 0.
- Portfolio UI refreshes as one content block (`summary + holdings + transactions`) after mutations.
- Bottom tab navigation on small screens is HTMX-boosted with push-state and loading indicator.
- Desktop nav is custom pill-style and independent of old Bootstrap collapse flow.

## Known Gaps / Follow-ups
- `express-rate-limit` is imported in `app.js` but currently not applied.
- Full runtime verification requires valid env (`MONGODB_URI`, OAuth keys, etc.).
- Consider adding automated tests for:
  - portfolio mutation flows
  - watchlist toggle state sync
  - HTMX navigation and active-state behavior

---

## Progress Log

### 2026-03-13 - Baseline understanding + architecture mapping
- Mapped complete codebase structure, route flow, models, services, jobs, and frontend partial system.
- Identified that `routes/api.js` is the primary HTMX interaction surface.
- Validation:
  - static inspection across backend/frontend files.

### 2026-03-13 - Major mobile-first frontend + HTMX pass
- Implemented broad UX improvements:
  - mobile nav/offcanvas
  - watchlist quick add/toggle improvements
  - portfolio unified HTMX content refresh
  - transaction history rendering via fragment flow
  - global HTMX progress + request styling
- Added transaction aggregation helper in `services/portfolioService.js`.
- Updated backend route logic for portfolio/watchlist and stronger validation.
- Validation:
  - `node --check` on updated JS route/client files.

Touched files (major set):
- `routes/api.js`
- `routes/portfolio.js`
- `routes/stocks.js`
- `routes/dashboard.js`
- `services/portfolioService.js`
- `views/pages/portfolio.ejs`
- `views/pages/stocks.ejs`
- `views/pages/watchlist.ejs`
- `views/pages/stock-detail.ejs`
- `views/pages/dashboard.ejs`
- `views/fragments/portfolio-content.ejs`
- `views/fragments/portfolio-holdings.ejs`
- `views/fragments/portfolio-transactions.ejs`
- `views/fragments/watchlist-items.ejs`
- `views/fragments/search-results.ejs`
- `views/layout.ejs`
- `views/partials/nav.ejs`
- `public/js/app.js`
- `public/js/dashboard.js`
- `public/css/components.css`
- `public/css/dashboard.css`

### 2026-03-13 - Targeted fixes requested by user
- Fixed desktop nav quality with custom pill navigation and profile chip.
- Added/adjusted buy/sell modal HTMX indicators and deterministic close/reset on success.
- Improved mobile portfolio cards to always show explicit P/L amount.
- Converted bottom mobile tabs to HTMX boosted navigation with:
  - `hx-target="#app-content"`
  - `hx-select="#app-content"`
  - `hx-push-url="true"`
  - bottom-tab loading indicator
- Added active route synchronization after HTMX swaps and browser history navigation.
- Validation:
  - `node --check public/js/app.js`
  - `node --check public/js/dashboard.js`
  - `node --check routes/api.js`
  - `node --check routes/portfolio.js`
  - `node --check routes/stocks.js`

Touched files:
- `views/layout.ejs`
- `views/partials/nav.ejs`
- `views/pages/portfolio.ejs`
- `views/fragments/portfolio-holdings.ejs`
- `public/js/app.js`
- `public/css/components.css`

### 2026-03-13 - Buy modal close/backdrop fix
- What changed:
  - Added robust `closeModalFully(modalId)` helper in portfolio page script to fully remove modal/backdrop/body lock state.
  - Applied helper to both successful buy and sell HTMX form submissions for consistent behavior.
- Why:
  - Buy flow could leave page blur/backdrop even after successful submit because modal hide was not always fully cleaning state.
- Validation:
  - Manual code path review in `views/pages/portfolio.ejs`.
  - Note: `node --check` cannot validate `.ejs` templates directly.
- Open issues:
  - Browser/manual verification still recommended to confirm behavior on target devices.

Touched files:
- `views/pages/portfolio.ejs`

### 2026-03-13 - Landing page visual + icon overhaul
- What changed:
  - Added Font Awesome loading support in layout/CSP and replaced landing-facing inline SVG icons with Font Awesome icons.
  - Replaced remaining SVG icons in landing-rendered fragments/partials:
    - hero + CTA + feature + market/stock preview icons
    - market overview gainers/losers icons
    - shared nav and footer icons shown on landing
  - Added a mobile-first landing style compatibility layer for current `landing.ejs` class names (`hero-*`, `landing-*`, section wrappers, table headings).
  - Added landing HTMX request indicators (`ticker`, `market overview`, `stocks table`) and progress styling for app-like request feedback.
  - Improved stock preview mobile table behavior by hiding company/change columns on small screens to match table headers.
- Why:
  - Landing template classes had no matching CSS definitions, causing visibly missing styles.
  - The page still used inline SVG icons despite the request to switch to Font Awesome.
  - Landing HTMX indicators were referenced but missing in DOM/CSS.
- Validation:
  - `node --check app.js`
  - `node --check public/js/app.js`
  - `node --check public/js/landing.js`
  - `rg -n "<svg"` across landing-facing templates/partials confirmed no remaining SVG icons in those files.
  - Class coverage check confirmed landing template custom classes now resolve to CSS selectors.
- Open issues:
  - Final visual QA still required in browser on target mobile devices for spacing/typography tuning.

Touched files:
- `app.js`
- `views/layout.ejs`
- `public/css/landing.css`
- `views/pages/landing.ejs`
- `views/partials/market-overview.ejs`
- `views/fragments/stock-table.ejs`
- `views/partials/nav.ejs`
- `views/partials/footer.ejs`

### 2026-03-14 - Landing page SEO copy refresh
- What changed:
  - Rewrote homepage title and SEO metadata for stronger coverage of DSE, Dar es Salaam Stock Exchange, Tanzania stocks, portfolio tracker, watchlist, and price alerts.
  - Refined landing page content into bilingual Swahili/English copy, keeping core financial terms in English where clarity matters.
  - Added richer explanatory content and a FAQ section to improve keyword depth and long-tail search relevance.
  - Updated footer and empty stock-table copy to align with the new homepage messaging.
- Why:
  - The landing page had functional UI but relatively thin SEO-focused copy and generic metadata.
  - The requested bilingual positioning needed clearer language for Tanzanian investors while preserving precise financial terminology.
- Validation:
  - `node --check routes/index.js`
  - Manual review of updated `.ejs` content and metadata wiring.
  - Manual inspection that homepage sections still use existing CSS classes and layout structure.
- Open issues:
  - Browser QA is still recommended to review final line wrapping and content density on small screens.
  - Open Graph image/Twitter card metadata is still not defined if social preview optimization is needed later.

Touched files:
- `routes/index.js`
- `views/layout.ejs`
- `views/pages/landing.ejs`
- `views/fragments/stock-table.ejs`
- `views/partials/footer.ejs`

### 2026-03-14 - Footer product attribution
- What changed:
  - Added `A TanzaByte Digital Product.` attribution line to the site footer.
- Why:
  - To clearly indicate that HisaZangu was created by TanzaByte Digital.
- Validation:
  - Manual review of footer markup in the shared footer partial.
- Open issues:
  - Browser QA is still recommended to confirm spacing and readability in the footer on small screens.

Touched files:
- `views/partials/footer.ejs`

### 2026-03-14 - Footer attribution brand styling
- What changed:
  - Styled the `TanzaByte` footer attribution using the same primary text and gold accent treatment used in the brand wordmark.
- Why:
  - To visually connect the creator attribution with the site branding instead of leaving it as flat muted text.
- Validation:
  - Manual review of updated footer markup and inline brand color usage.
- Open issues:
  - Browser QA is still recommended to confirm contrast and spacing in the footer across devices.

Touched files:
- `views/partials/footer.ejs`

### 2026-03-14 - Footer attribution copy refinement
- What changed:
  - Rewrote the footer attribution to a more branded line: `Crafted in Tanzania by TanzaByte Digital.` while keeping the brand color treatment.
- Why:
  - To make the creator attribution feel more intentional and distinctive instead of sounding generic.
- Validation:
  - Manual review of footer copy and markup.
- Open issues:
  - Browser QA is still recommended to confirm the final tone and spacing in context.

Touched files:
- `views/partials/footer.ejs`

---

## Update Template (Use After Every Change)
Copy this block and fill it:

### YYYY-MM-DD - Short change title
- What changed:
- Why:
- Validation:
- Open issues:

Touched files:
- `path/to/file1`
- `path/to/file2`
