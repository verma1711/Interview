# Interview Booking Portal — project and agent guide

Last updated: 2026-10-09.

This document describes the current application, its features, architecture, development workflow, and operational constraints. Read `AGENTS.md` for the requirement to keep this guide current with every implementation. Existing focused notes are linked below; historical validation in those notes is not proof that a new change has been deployed.

## Purpose and architecture

The portal lets candidates register, book interviews, submit payment references, and manage bookings. Administrators manage candidates, payments, refunds, availability, pricing, and bookings. Visitors can inspect blocked schedules without logging in.

Production is a Google Sheets-bound Google Apps Script web app using V8. Google Sheets holds records; Apps Script integrates with Calendar, email, and Google People contacts. `doGet()` serves `Index.html` through HtmlService. The browser calls public server functions through `google.script.run`, wrapped by the client `call()` helper. There is no frontend build step, npm package, external application database, or Node production server.

The local Node server emulates Apps Script and Google services in memory. It is solely a development preview. Restarting it discards edits and recreates sample data.

## File map

| File | Responsibility |
| --- | --- |
| `Index.html` | Complete browser UI, responsive CSS, navigation, rendering, RPC helper, forms, session restoration, and client validation |
| `00_Config.js` | Constants, HTML entry point, sheet helpers, IDs, formatting, timezone conversion, settings, audit, Calendar/email/contact helpers |
| `01_Setup.js` | Sheet setup/defaults, legacy import, owner-only initialization and destructive testing reset |
| `02_AuthCandidates.js` | Registration, candidate/admin login, password recovery/change, logout, profile and timezone APIs |
| `03_Bookings.js` | Public/private blocked schedules, quotes, pricing, availability, booking creation, candidate booking projection and cancellation |
| `04_Admin.js` | Dashboard projection and privileged candidate/booking/payment/refund/settings/availability operations |
| `05_AuthSecurity.js` | Password hashing, authentication schema, sessions, credential migration, owner checks and locks |
| `06_BookingIntegrity.js` | Settings/availability validation, cancellation/refund consistency and retryable external booking work |
| `appsscript.json` | V8 runtime, Asia/Kolkata script timezone, enabled People API and required Google scopes |
| `local-preview/server.cjs` | Loopback HTTP preview and allowlisted RPC endpoint |
| `local-preview/mock-store.cjs` | In-memory Google service mocks and seeded accounts/records |
| `local-preview/shim.txt` | Browser replacement for `google.script.run` in the preview |
| `local-preview/browser-check.cjs` | Edge remote-debugging helper for optional browser walkthroughs/screenshots |
| `tests/*.test.cjs` | Dependency-free Node tests using mocked Apps Script services/browser contexts |
| `AUTHENTICATION.md` | Detailed authentication setup, upgrade, reset and storage notes |
| `BOOKING_FIXES.md` | Booking integrity implementation and historical validation notes |
| `local-preview/README.md` | Preview commands, sample logins and mock limitations |
| `AGENTS.md` | Repository agent instructions and documentation maintenance requirement |

## Current layout mode

Screen-size responsiveness is temporarily disabled at the user's request. The portal uses a fixed 1365px desktop canvas at all window sizes; smaller windows scroll horizontally. Width-based media queries are retained but disabled with `not all` so they can be restored later. Navigation stays in desktop tabs, tables retain columns rather than switching to cards, and form grids retain desktop widths. Reduced-motion accessibility rules remain active. Floating pickers still stay within viewport bounds for usability.

## Candidate and visitor features

- Landing page offers candidate login, registration and admin login; public blocked-schedule lookup accepts a date and timezone and exposes times without candidate/payment details.
- Registration accepts name, email, country code, phone, timezone and matching passwords. Login accepts candidate ID or email.
- Forgot Password sends a six-digit recovery code to the registered email. Candidates can also change their password while signed in. Successful changes clear the session and show an inline success message on the appropriate sign-in screen; validation/errors stay inline on the password form. Admin password changes follow the same flow without browser alert dialogs.
- Candidate navigation contains Dashboard, Blocked Schedules, Book Interview, Change Password and Logout. The active page is highlighted; hover/press effects provide feedback and reduced-motion preferences disable navigation animation. Logout has a separate exit icon: its arrow slides outward on hover/focus, the button fills red, and pressing gently shrinks it. The same effect applies to candidate navigation and desktop/mobile admin logout.
- Dashboard shows candidate ID, account type and timezone. Timezone changes use Edit/Save/Cancel controls.
- The candidate dashboard shows Preferred time format inside the Candidate ID section; admin retains the control above navigation. Both offer 12 hours and 24 hours. Defaults to 12 hours; preferences persist in this browser's localStorage separately per candidate ID and for admin. This is a browser display preference, not a Sheet-backed setting shared across devices. Switching updates times across visible tables, schedules, quote/payment summaries and time-field triggers without reloading forms or changing booking data. New rendered content follows the preference via the existing UI observer. Time pickers offer either hours 1–12 plus AM/PM or hours 00–23; original `HH:mm` input values and UTC server timestamps remain unchanged. Time sorting continues to use canonical source data.
- The interview table has ID, Type, Date, Start, End, Booking status, Payment verification, Refund status, Charge and action columns. It has no separate “My Interviews” heading. Dates/times use the candidate timezone. Overnight ends include the end date.
- Each data-column header is a keyboard-accessible sort button. Clicking a new column sorts ascending; repeated clicks toggle direction. Date defaults to descending. Date uses chronological values, Start/End use minutes in the displayed day, Charge uses numbers, and other columns use text comparison. SVG up/down arrows highlight the active direction; `aria-sort` exposes it to assistive technology. Headers stay visible in the fixed desktop table layout.
- Status controls filter All, Payment pending, Paid & verified, No payment required, Refund requested and Refunded. A selected control is highlighted. Filtering preserves sorting; empty matches have a specific message. This UI state lives in browser memory.
- The right side of the dashboard table toolbar has All dates, Today, Tomorrow, Yesterday and Range. Relative days follow the candidate profile timezone, and matching uses the interview's start date in that timezone. Range reveals styled From/To calendars and Apply range; both endpoints are inclusive. Missing/reversed endpoints show inline validation. Date filters combine with status filters and preserve column sorting. All dates clears date restrictions. Filter state lives in browser memory.
- Future confirmed bookings expose Cancel; expired cancellation buttons are hidden by a client guard and server checks enforce cancellation eligibility.
- Booking accepts date, start/end, interview type and an explicit overnight confirmation when needed. The quote checks availability and shows pricing before submission. Regular candidates supply payment amount and UTR/reference when required; UPI ID and optional QR image come from settings. Quotes are invalidated when inputs/timezone change and rechecked server-side at submission.
- Interview type uses a styled options panel in candidate/admin booking forms. Date/time inputs throughout the portal use matching calendar and time panels: month navigation, Today/Clear, hour/minute/AM-PM selection and Apply time. Original input/select fields retain their IDs and values; selections dispatch input/change events so existing quote, availability and overnight logic runs. A MutationObserver enhances dynamically rendered forms and synchronizes disabled states. Panels stay within viewport bounds, support keyboard Tab/Escape, restore focus after selection, and close on outside clicks, page scrolling or resize. Browsers without MutationObserver retain native controls.
- Blocked Schedules supports a chosen date/timezone; the booking form also shows occupied times for its selected date.
- Welcome-page and candidate/admin Blocked Schedules tables have clickable Status, Date, Start and End headers with SVG direction indicators and `aria-sort`. Start defaults to ascending; clicks toggle direction. Dates/times sort chronologically, including next-day end dates. Each table retains its own sort selection when refreshed, and sorting uses cached results without another server request.
- Timezone dropdowns in registration, candidate profile, public/candidate/admin Blocked Schedules and admin Settings use the shared styled picker with case-insensitive search and a scrollable options list. Candidate profile and Settings controls remain disabled until Edit. Original timezone values/aliases and input/change behavior are preserved; Cancel restores the displayed value as well as the underlying field.

## Admin features

- Dashboard shows candidate/upcoming/pending-payment/refund counts and confirmed bookings for a selected business date.
- Navigation includes Dashboard, Blocked Schedules, Bookings, Candidates, Payments, Refunds, Availability, Settings and Create Booking; a mobile menu implementation is retained but disabled in the current fixed desktop layout. Selections reflect the active page.
- Bookings show candidate details, business-timezone times, amounts and statuses. Confirmed bookings allow explicit amount editing and future cancellation; cancelled bookings are read-only.
- Candidates can be created/managed with regular or percentage account type, percentage and timezone. Edit/Save/Cancel avoids accidental immediate changes.
- Payments can be marked VERIFIED or FAILED. Verified payments no longer expose verification actions.
- Refund requests can be completed with a refund reference. A cancelled booking must have VERIFIED payment before refund completion.
- Availability editor supports weekly working windows and dated blocks, including full-day blocks. Relevant weekday/date inputs follow rule type.
- Settings configure business timezone, buffers, UPI ID/QR, pricing and Calendar name. Admin can change their own password.
- Create Booking supports selecting a candidate and administrator booking controls. Live search on Candidates, Bookings, Payments and Refunds matches related candidate/booking fields without replacing unsaved edit inputs.

## Data model and statuses

Setup creates eight reserved tabs and adds missing columns while preserving existing/custom columns. Exact columns are defined in `01_Setup.js`; authentication columns are defined in `05_AuthSecurity.js`.

| Sheet | Stored data |
| --- | --- |
| `Candidates` | Identity/contact, account type/percentage, timezone, active flag, contact reference, timestamps, password and recovery fields |
| `AuthSessions` | Hashed session token, role, candidate/email identity, credential version and expiration |
| `InterviewsV3` | Booking/candidate IDs, identity snapshot, interview type, UTC endpoints/duration, candidate timezone, prices/payment amounts, percentage snapshot, statuses, UTR, Calendar reference, remarks and legacy source |
| `Payments` | Payment/booking/candidate IDs, expected/submitted USD amounts, UTR, submission/verification times and status/remark |
| `Refunds` | Refund/booking/candidate IDs, USD amount, requested/completed timestamps, status, refund reference and admin remark |
| `Settings` | Key/value configuration |
| `Availability` | Rule ID/type, weekday or date, start/end, enabled flag and note |
| `Audit Log` | UTC timestamp, actor, action, entity/ID and details |

Booking statuses include CONFIRMED and CANCELLED. Payment states include SUBMITTED, VERIFIED, FAILED and NOT_REQUIRED. Refund states include REQUESTED, REFUNDED and NOT_REQUIRED; failed-payment handling can reject a pending request. Candidate labels translate these codes to readable text. Public/profile projections exclude authentication secrets.

New candidate IDs use an `AV-` prefix and five-character suffix; booking/payment/refund/rule IDs use their prefix and six-character suffix. Existing IDs remain valid. Session tokens remain full-length secrets.

## Time, availability, pricing and reliability

Store booking endpoints as UTC; convert to candidate or configured business timezone for display/input. Business timezone defaults to America/New_York, while script timezone is Asia/Kolkata. Do not treat the historical `startIST` admin projection field name as proof that its value is IST: it uses configured business time. Valid timezone aliases such as Asia/Calcutta and non-preset zones are retained.

Date filtering uses calendar dates in the requested zone. Local-to-UTC conversion validates DST edge cases. Overnight booking requires explicit confirmation and advances the end date. Availability considers weekly windows, dated blocks, occupied bookings and before/after buffers. The default seeded working window is 12:00–20:00 every day in business time; both buffers default to 30 minutes.

Pricing defaults to started 60-minute blocks with a 30-minute short threshold, $50 short price and $70 long price: 30 minutes=$50, 40=$70, 90=$120, 100=$140. Regular candidates require payment; percentage accounts follow their separate server booking path and percentage snapshot. Currency defaults to USD. Settings are authoritative; do not hard-code production prices in UI.

Mutation locks serialize booking and other shared writes. Booking submission rejects stale quotes, past starts, overlapping slots, duplicate UTRs and invalid monetary values. Sheet updates preserve unrelated cells/formulas and store leading `=` inputs as literal text. Cancellation creates at most one refund request.

Calendar/email failure preserves the saved booking and queues pending work in Script Properties (`BOOKING_WORK_...`) with audit errors. Owner-only `retryPendingBookingWork()` retries it. Calendar retries check booking markers; email retries can repeat a notification. Sheets, Calendar and email are not a single transaction. New Calendar references include calendar ID; legacy event-only references still depend on the original calendar setting.

## Authentication and access

Candidate passwords use salted PBKDF2-HMAC-SHA256 (600,000 iterations). Legacy candidate credentials migrate after successful password login. Admin credentials retain the existing hash scheme in Script Properties. Password length is 8–1024 characters.

Session records store token hashes; the browser stores the bearer token in localStorage. Sessions last six hours and restore after refresh after server validation. Server role checks control all protected operations. Logout revokes the session. Candidate credential changes/deactivation invalidate earlier sessions; admin password change revokes admin sessions.

Recovery codes expire after ten minutes, allow five attempts, are single-use and have a one-minute resend interval. Five failed logins lock the relevant account for fifteen minutes. Recovery hashes use a server-only HMAC secret. Setup, migration, reset and retry maintenance require the active/effective Google user owner check. See `AUTHENTICATION.md` for implementation detail.

## Local development and testing

Run from the project root with Node available:

```powershell
node local-preview/server.cjs
```

Open `http://127.0.0.1:8787`. `PREVIEW_PORT` can override the port. Reload for HTML/CSS/client changes; restart for server-code changes or to reset seed data. The server listens only on loopback, allows client RPC names, rejects cross-origin browser RPCs, and uses a separate local-preview session-storage key.

| Preview account | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | Admin123! |
| Regular candidate | candidate@example.com | Candidate123! |
| Percentage candidate | maya@example.com | Candidate123! |

These are disposable preview credentials. Generated candidate IDs change on restart; use email to log in. Recovery codes appear in local alerts. No real Google data, payments, email, Calendar events or Contacts are created.

Run all tests (PowerShell-compatible, stopping on failure):

```powershell
Get-ChildItem tests/*.test.cjs | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Test failed: $($_.Name)" }
}
```

| Test | Coverage |
| --- | --- |
| `admin-search.test.cjs` | Admin live search/edit behavior, candidate status/date-filter/sort rendering, timezone date boundaries and inclusive ranges, availability UI and business-date dashboard |
| `auth.test.cjs` | Schema/hash correctness, registration/login/recovery/session lifecycle, role enforcement, client restoration and mocked integrations |
| `availability.test.cjs` | Rule cell types, timezone/date handling, blocks, overnight availability and durations |
| `booking-integrity.test.cjs` | Locks/validation, IDs, pending work, refunds, blocks, throttling and payment-input capture |
| `pickers.test.cjs` | Leap-year/month date generation, AM/PM conversion, original-field event dispatch, focus restoration, timezone search/index preservation, preferred time formatting/account separation and SVG arrow regression |
| `public-bookings.test.cjs` | Public privacy projection, timezone boundaries, cancellation exclusion and DST |
| `reset.test.cjs` | Owner-only reset, cleanup, preserved unrelated data and setup after reset |

`local-preview/browser-check.cjs` can connect to an Edge page using remote debugging on port 9333. Existing PNGs are historical screenshots, not automatic evidence of current UI. Local tests do not validate Google authorization, actual service delivery, quotas, deployed latency or real concurrent requests.

## Production setup and maintenance

1. Use the existing Sheets-bound Apps Script project and upload all `00_`–`06_` server files, `Index.html`, and `appsscript.json`. Local preview/tests/documentation are not production application files; `.claspignore` excludes preview/tests.
2. For a new installation, set `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` in Script Properties, run `runInitialSetup()` manually as owner, then remove those initialization properties.
3. For an existing authentication upgrade, run `upgradeCandidateAuthentication()` as owner; it preserves existing data/settings while adding authentication schema. See `AUTHENTICATION.md`.
4. Authorize required scopes: current spreadsheet, email sending, Calendar, Contacts and user identity. The manifest enables Advanced People API v1.
5. Configure actual business timezone, availability, buffers, pricing, notification email, UPI/QR and Calendar. QR supports HTTPS image URLs or Drive image file links; Drive sharing must permit image access.
6. Update the web-app deployment and perform deployed registration/login/recovery/refresh/logout, booking/payment/refund, Calendar and contact smoke checks.

`migrateLegacyInterviews()` imports compatible legacy rows while tracking source rows to avoid duplication. `resetInterviewPortalForTesting()` permanently deletes the eight portal tabs and portal authentication/pending-work properties. It preserves unrelated tabs/properties and external Calendar/Contacts; it is a destructive owner-only maintenance command, never a routine fix. Reinitialization does not remove orphaned external events/contacts.

## Change history

### 2026-10-09 — Candidate dashboard columns and status filtering

- Split the long combined time cell into Date, Start and End; show end date for overnight interviews.
- Converted display-only payment/refund badges into working filters with All, selected state and empty results.
- Updated responsive column labels and added regression checks in `tests/admin-search.test.cjs`.
- Files: `Index.html`, `tests/admin-search.test.cjs`. All six local test files passed. No production deployment performed.

### 2026-10-09 — Sorting, navigation feedback and agent handoff

- Removed the My Interviews heading. Added sortable data-column headers with direction indicators, numeric/time/date sorting, filter compatibility and visible controls on smaller screens.
- Added navigation hover/press/underline effects and candidate/admin active-page indicators; reduced-motion preferences disable navigation animation.
- Added this project guide and root `AGENTS.md` requiring future agents to update the guide and change history in each implementation task.
- Files: `Index.html`, `tests/admin-search.test.cjs`, `PROJECT_GUIDE.md`, `AGENTS.md`. All six local test files passed; added sorting/filter compatibility and active navigation checks passed. Local preview returned HTTP 200. Browser visual inspection was unavailable because the Edge debugging endpoint was not running. No production deployment performed.

### 2026-10-09 — Reliable arrows and styled input pickers

- Fixed literal question marks in sort headers by replacing text arrow characters with SVG up/down arrows and an active-direction highlight.
- Added shared styled interview-type, calendar and time panels with original-field event dispatch, mobile positioning, disabled-state handling and keyboard focus/Escape behavior. Moved initial session restoration after picker initialization to retain the client test harness's controlled restoration flow.
- Files: `Index.html`, `tests/pickers.test.cjs`, `PROJECT_GUIDE.md`; screenshots: `local-preview/browser-picker-calendar.png`, `browser-picker-time.png`, `browser-picker-mobile.png`.
- All seven local test files passed. A local Edge browser verified calendar selection, interview-type selection, 12:35 PM conversion to `12:35`, nine SVG sort indicators, Escape dismissal and a 390px layout without page overflow. Calendar/time desktop screenshots were visually inspected. No uncaught exceptions were observed during that walkthrough. No production deployment performed.

### 2026-10-09 - Distinct Logout animation

- Added an SVG exit icon to all three Logout buttons. Hover/focus slides the arrow outward and fills the button red; press gently shrinks it. Removed the navigation underline/lift effect from Logout, with reduced-motion support.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Logout/session behavior is unchanged. Validation: client syntax and existing UI checks passed; local Edge checks confirmed the red hover fill, hidden underline, 3px arrow movement and disabled motion with reduced-motion enabled; no browser exceptions observed. No production deployment performed.

### 2026-10-09 - Styled timezone dropdowns

- Extended the shared picker to registration, profile, public/private Booked Times and Settings timezone selects. Added search, scrollable results, empty-match messaging, keyboard focus handling, disabled-state synchronization and displayed-value restoration after Cancel.
- Files: `Index.html`, `tests/pickers.test.cjs`, `PROJECT_GUIDE.md`. Picker and existing UI tests passed. Local Edge checks confirmed search/selection, empty results, profile Edit enablement and preserved timezone values with no uncaught exceptions. No production deployment performed.

### 2026-10-09 - Temporarily disable screen-size responsiveness

- Disabled width-based CSS breakpoints and fixed the content/header to a 1365px desktop canvas. Smaller windows scroll instead of switching navigation, tables or forms to mobile layouts. Reduced-motion support and viewport-aware floating pickers remain enabled.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Validation: existing UI and picker checks; local browser comparison at 1600px, 1000px and 390px verified a constant 1365px content width and desktop navigation. No browser exceptions observed. No production deployment performed.

### 2026-10-09 - Candidate dashboard date filters

- Added a right-aligned All dates/Today/Tomorrow/Yesterday/Range toolbar. Relative dates use candidate timezone; inclusive ranges use the shared calendars and inline validation. Date filtering combines with status filtering and sorting.
- Files: `Index.html`, `tests/admin-search.test.cjs`, `PROJECT_GUIDE.md`. UI/picker checks passed, including midnight timezone boundaries, day/year/leap-day transitions, inclusive range endpoints and invalid ranges. Local Edge verified Today filtering, enhanced range calendars and toolbar alignment without overlap or uncaught exceptions. Screenshot: `local-preview/browser-dashboard-date-filter.png`. No production deployment performed.

### 2026-10-09 - Rename Blocked Schedules

- Renamed Booked Times to Blocked Schedules in candidate/admin navigation, headings, lookup actions and prompts, including the public lookup and booking-form section. Updated current feature descriptions; internal API/function names and schedule behavior remain unchanged.
- Files: `Index.html`, `tests/admin-search.test.cjs`, `PROJECT_GUIDE.md`. Existing UI and public-schedule checks passed. No production deployment performed.

### 2026-10-09 - Blocked Schedules table sorting

- Added clickable Status/Date/Start/End sorting to welcome, candidate and admin schedule tables. Uses SVG arrows, independent table sort state, chronological AM/PM and overnight-end comparisons, and cached results without extra RPCs.
- Files: `Index.html`, `tests/admin-search.test.cjs`, `PROJECT_GUIDE.md`. UI and public-schedule checks passed, including sort direction toggles, overnight ordering, independent table state and source-data preservation. No production deployment performed.

### 2026-10-09 - Preferred 12/24-hour time format

- Added Preferred time format controls to candidate/admin pages, with browser-local per-candidate/admin persistence and a 12-hour default. Display conversion updates existing/new UI without replacing forms, and time pickers switch between AM/PM and 00?23 hours. Booking values, timezones and canonical sorting data are preserved.
- Files: `Index.html`, `tests/pickers.test.cjs`, `PROJECT_GUIDE.md`. All seven existing test files passed; added format/account-isolation checks passed. Local Edge verified candidate/admin 12/24-hour switching, a 24-option hour picker without AM/PM, and selection of 23:45 displaying as 11:45 PM when switched back. No uncaught browser exceptions observed; no production deployment performed.

### 2026-10-09 - Move candidate time format into profile

- Moved the candidate Preferred time format control from above navigation into the Candidate ID section, beneath the ID, with a compact stacked layout. Admin placement and preference behavior remain unchanged.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Existing UI and picker checks passed. No production deployment performed.

### 2026-10-09 - Inline password-change confirmation

- Replaced the browser alert after candidate/admin password changes with an inline success message on the appropriate sign-in page, after clearing the invalidated session. Form errors remain inline.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Targeted password-change checks passed for both roles, errors and mismatched confirmation. No production deployment performed.
