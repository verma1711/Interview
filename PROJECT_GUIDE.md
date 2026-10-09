# Interview Booking Portal â€” project and agent guide

Last updated: 2026-10-10.

This document describes the current application, its features, architecture, development workflow, and operational constraints. Read `AGENTS.md` for the requirement to keep this guide current with every implementation. Existing focused notes are linked below; historical validation in those notes is not proof that a new change has been deployed.

## Purpose and architecture

The portal lets candidates register, book interviews, submit payment references, and manage bookings. Administrators manage candidates, payments, refunds, availability, pricing, and bookings. Visitors can inspect blocked schedules without logging in.

Production is a Google Sheets-bound Google Apps Script web app using V8. Google Sheets holds records; Apps Script integrates with Calendar, email, and Google People contacts. `doGet()` serves `Index.html` through HtmlService. The browser calls public server functions through `google.script.run`, wrapped by the client `call()` helper. There is no frontend build step, npm package, external application database, or Node production server.

The local Node server emulates Apps Script and Google services in memory. On loopback pages bearing the LOCAL TEST DATA ONLY notice, the shared call helper sends JSON directly to /rpc using fetch; it preserves server errors, recovery-code notices and loading cleanup without relying on the google.script.run shim. Deployed Apps Script continues to use google.script.run. It is solely a development preview. Restarting it discards edits and recreates sample data.

## File map

| File | Responsibility |
| --- | --- |
| `Index.html` | Self-contained HTML, CSS, shared time/admin helpers, navigation, forms, rendering, RPC helper, session restoration and client validation |
| `00_Config.js` | Constants, HTML entry point, sheet helpers, IDs, formatting, timezone conversion, settings, audit, Calendar/email/contact helpers |
| `01_Setup.js` | Sheet setup/defaults, legacy import, owner-only initialization and destructive testing reset |
| `02_AuthCandidates.js` | Registration, candidate/admin login, password recovery/change, logout, profile and timezone APIs |
| `03_Bookings.js` | Public/private blocked schedules, quotes, pricing, availability, booking creation, candidate booking projection and cancellation |
| `04_Admin.js` | Dashboard projection and privileged candidate/booking/payment/refund/settings/availability operations |
| `05_AuthSecurity.js` | Password hashing, authentication schema, sessions, credential migration, owner checks and locks |
| `06_BookingIntegrity.js` | Settings/availability validation, cancellation/refund consistency, persisted external work/errors and role-checked retries |
| `07_AdminData.js` | Admin overview, bounded table pages, global search/sort/filter and lightweight booking candidate choices |
| `appsscript.json` | V8 runtime, Asia/Kolkata script timezone, enabled People API and required Google scopes |
| `local-preview/server.cjs` | Loopback HTTP preview and allowlisted RPC endpoint |
| `local-preview/mock-store.cjs` | In-memory Google service mocks and seeded accounts/records |
| `local-preview/read-ui.cjs` | Reads the UI for preview and tests; supports trusted includes for compatibility |
| `local-preview/shim.txt` | Browser replacement for `google.script.run` in the preview |
| `local-preview/browser-check.cjs` | Edge remote-debugging helper for optional browser walkthroughs/screenshots |
| `tests/*.test.cjs` | Dependency-free Node tests using mocked Apps Script services/browser contexts |
| `LOCAL_TEST_CASES.md` | Local-only test checklist covering modules, edge cases, reported regressions and complete user journeys; results must be recorded separately |
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
- Candidate navigation contains Dashboard, Blocked Schedules, Book Interview, Change Password and Logout. Admin navigation also has a separate Change Password page, available in desktop tabs and the retained mobile menu; Settings only contains application configuration. The active page is highlighted; hover/press effects provide feedback and reduced-motion preferences disable navigation animation. Logout has a separate exit icon: its arrow slides outward on hover/focus, the button fills red, and pressing gently shrinks it. The same effect applies to candidate navigation and desktop/mobile admin logout.
- Dashboard shows candidate ID, account type and timezone in a compact profile row. Timezone changes use Edit/Save/Cancel controls.
- A compact unlabeled 12 hours/24 hours selector is always visible in the shared header, including the welcome page. Defaults to 12 hours; preferences persist in this browser's localStorage separately per candidate ID and for admin. This is a browser display preference, not a Sheet-backed setting shared across devices. Switching updates times across visible tables, schedules, quote/payment summaries and time-field triggers without reloading forms or changing booking data. UTC-backed display spans follow the preference via the existing UI observer. Only marked date/time elements are updated; names, references and unrelated text are not scanned or rewritten. Cached Intl formatters convert UTC timestamps directly into the selected timezone and format. Time pickers offer either hours 1â€“12 plus AM/PM or hours 00â€“23; original `HH:mm` input values and UTC server timestamps remain unchanged. Time sorting continues to use canonical source data.
- The interview table has ID, Type, Date, Start, End, Booking status, Payment verification, Refund status, Charge and action columns. It has no separate â€œMy Interviewsâ€ heading. Dates/times use the candidate timezone. Overnight ends show a highlighted Next day label and end date. Same-day ends show only the time, including older server responses that provide startUTC but a human-readable end value: both local date labels are normalized before comparison.
- Each data-column header is a keyboard-accessible sort button. Clicking a new column sorts ascending; repeated clicks toggle direction. Date defaults to descending. Date uses chronological values, Start/End use minutes in the displayed day, Charge uses numbers, and other columns use text comparison. SVG up/down arrows highlight the active direction; `aria-sort` exposes it to assistive technology. Headers stay visible in the fixed desktop table layout.
- All, Payment pending and Paid & verified are visible status controls. More filters contains No payment required, Refund requested and Refunded; its summary indicates an active extra filter. Selected controls are highlighted. Filtering preserves sorting. An empty booking list offers Book Interview; an empty filtered result offers Clear filters, which resets both status and date restrictions. This UI state lives in browser memory.
- The right side of the dashboard table toolbar has All dates, Today, Tomorrow, Yesterday and Range. Relative days follow the candidate profile timezone, and matching uses the interview's start date in that timezone. Range reveals styled From/To calendars and Apply range; both endpoints are inclusive. Missing/reversed endpoints show inline validation. Date filters combine with status filters and preserve column sorting. All dates clears date restrictions. Filter state lives in browser memory.
- Future confirmed bookings expose Cancel; expired cancellation buttons are hidden by a client guard and server checks enforce cancellation eligibility.
- Candidate booking accepts date, start/end and interview type. Candidates must select an end time later than the start on the same local date; the form shows an inline error for reversed/equal times and candidate quote/submission APIs reject them, even with an overnight confirmation flag. Only the admin form retains its overnight checkbox; keep the start date selected (for example 11 PM on October 10 to 1 AM on October 11). Admin server conversion advances the end date only after explicit confirmation. The quote checks availability and shows pricing before submission. Regular candidates supply payment amount and UTR/reference when required; UPI ID and optional QR image come from settings. Quotes are invalidated when inputs/timezone change and rechecked server-side at submission.
- Interview type uses a styled options panel in candidate/admin booking forms. Date/time inputs throughout the portal use matching calendar and time panels: month navigation, Today/Clear, hour/minute/AM-PM selection and Apply time. Original input/select fields retain their IDs and values; selections dispatch input/change events so existing quote, availability and overnight logic runs. A MutationObserver enhances dynamically rendered forms and synchronizes disabled states. Panels stay within viewport bounds, support keyboard Tab/Escape, restore focus after selection, and close on outside clicks, page scrolling or resize. Browsers without MutationObserver retain native controls.
- Blocked Schedules supports a chosen date/timezone; the booking form also shows occupied times for its selected date.
- Welcome-page and candidate/admin Blocked Schedules tables have clickable Status, Date, Start and End headers with SVG direction indicators and `aria-sort`. Start defaults to ascending; clicks toggle direction. Dates/times sort chronologically, including next-day end dates. Each table retains its own sort selection when refreshed, and sorting uses cached results without another server request.
- Timezone dropdowns in registration, candidate profile, public/candidate/admin Blocked Schedules and admin Settings use the shared styled picker with case-insensitive search and a scrollable options list. Candidate profile and Settings controls remain disabled until Edit. Original timezone values/aliases and input/change behavior are preserved; Cancel restores the displayed value as well as the underlying field.

## Admin features

- Admin tables offer Export Excel: Dashboard bookings, Bookings, Candidates, Payments and Refunds download a genuine .xlsx workbook matching the current search, status/date/upcoming filters and sort order. Exports include all matching records, not just the visible page: updated backends are read in 100-row authenticated pages; legacy cached datasets use the same local filters. Export snapshots filter/time-format settings and checks record totals, timezone and duplicate IDs while paging. Limit: 10,000 matching rows; narrow filters for larger exports. It exports saved records, not unsaved edit drafts. Workbook has styled headers, a frozen first row, Excel filters and fitted column widths. Dates use DD-MM-YY, times use the chosen 12/24-hour preference in general business timezone, and both endpoint dates plus timezone are included for bookings/payment/refund rows. Money/percentages stay numeric, IDs/phones/references stay literal text, and no authentication fields are mapped. ZIP/Open XML creation is inline and dependency-free; it does not create or modify Google Sheets/Drive files or require new scopes.
- Dashboard includes a To do attention box bringing pending payment and refund counts together with failed email/calendar updates. Payment/refund cards open their existing filtered pages. Older backends without work status display unavailable rather than claiming zero failures. Existing per-update retry controls remain below these counts. Dashboard shows live candidate/upcoming/pending-payment/refund counts as clickable metric cards with colored numbers and hover effects. Cards open Candidates, future confirmed Bookings, submitted Payments, or requested Refunds respectively, clearing unrelated date/status restrictions. The dashboard table has no Confirmed bookings heading, timezone caption or standalone date selector; All dates/Today/Tomorrow/Yesterday/Range controls remain. Refresh preserves the selected filter. Admin content pages omit redundant headings; all times still use business timezone. The dashboard Refresh action is a 38px icon control at the top left of the table card, with a blue hover state and rotating SVG (disabled by reduced-motion preference).
- Navigation includes Dashboard, Bookings, Candidates, Payments, Refunds, Availability, Settings, Change Password and Create Booking; a mobile menu implementation is retained but disabled in the current fixed desktop layout. Selections reflect the active page.
- Bookings use separate Date/Start/End columns in the business timezone, including next-day end dates, and matching colored booking/payment/refund badges. Status controls and right-aligned All dates/Today/Tomorrow/Yesterday/Range controls combine with live search. Confirmed bookings allow admin-only amount editing and future cancellation; cancelled bookings are read-only. Amount/reference corrections synchronize linked payment expected/submitted amounts and reference, and any incomplete refund amount. A missing payment row is created when an admin records a payment. Duplicate references and completed-refund amount changes are rejected before writes. Correction audits retain previous amounts and the resulting patch. Admin tables fit the fixed desktop canvas; Bookings has its own horizontal scroll region, while other tables wrap text and fit inline editors within their columns.
- Dashboard, Bookings, Candidates, Payments and Refunds have clickable sortable data-column headers with SVG arrows. Tables load 50 records per page with Previous/Next controls. Search, date/status filters and sorting run on the server before pagination, so they cover every record, not only the visible page. Candidate email, phone, account type and percentage use source fields rather than input-cell text. Numeric amounts/percentages and UTC dates sort correctly. Each table remembers its filters, page and sort state in browser memory. Unsaved candidate, booking and payment editor rows are retained across page/filter/sort changes and restored when visible; a successful save/refresh clears drafts.
- Payments and Refunds have matching status colors and combined status/date/search filters. Their date filters refer to the associated interview's start date in the configured business timezone. Range validation appears below the date fields in a styled inline error. Admin select controls, including candidate account type and availability rule selectors, use the shared styled picker and respect disabled states.
- Candidates can be created/managed with regular or percentage account type, percentage and timezone. Admin Edit/Save/Cancel also edits email and international phone number. Server validation rejects invalid/duplicate/admin-reserved email and invalid international phone format; validates all fields before writing. Email changes increment AuthVersion and clear pending recovery state, revoking old sessions. Changes are audited. Existing booking snapshots and external Google Contacts are not rewritten by this operation.
- Payments can be marked VERIFIED or FAILED. Verified and failed payments expose a styled Change control and an inline status-editor panel with matching spacing and Save/Cancel buttons, with a status selector and Save/Cancel for correction to VERIFIED, SUBMITTED or FAILED. The Change editor shows only the current-status selector and Save/Cancel; the reason field and Update payment status label are removed. Corrections automatically send a description of the previous/new status to the existing server audit/remark validation. Cancel closes the row locally and removes its retained draft so pagination/refresh cannot reopen a discarded editor. Open editors remain retained across navigation until saved or cancelled. All payment mutations require an admin session on the server; candidates can submit payment details when booking but cannot verify or correct payments. Audit entries preserve administrator identity, previous/new status, reason and previous verification timestamp/remark. Server validation synchronizes booking/payment status and cancellation refund requests under the existing lock. Completed refunds cannot be made unverified; verification timestamps are cleared when moving back to pending/failed.
- Refund requests can be completed with a refund reference. A cancelled booking must have VERIFIED payment before refund completion.
- Availability has a separate Business timezone selector backed by AVAILABILITY_TIMEZONE; weekly hours and dated/full-day blocks follow only this zone. General Settings timezone affects booking/admin display but does not change the availability schedule. Rule fields and timezone start locked. Edit sits beside Add Rule in a shared styled bottom toolbar; editing reveals Save/Cancel. Cancel restores all saved values. Changing the availability timezone deliberately applies the entered clock hours to the newly selected zone; saving the zone and rules uses the role-checked locked API. Note is omitted from the screen but preserved in hidden fields, and disabled rules retain their enabled state. The older preview cannot save a new independent timezone: the UI checks availabilityTimezoneEditable and shows an inline update-server message instead of silently accepting an unsupported save.
- Admin sign-in includes Forgot password with an email-code reset form. requestAdminPasswordReset sends a six-digit code only to configured ADMIN_EMAIL, returning a generic response for unrecognized addresses. Codes expire in ten minutes, allow five failed attempts, and have a one-minute resend limit. Only an HMAC digest is stored in ADMIN_PASSWORD_RESET Script Properties; email delivery failures clear pending recovery. resetAdminPassword verifies email/code, applies existing password policy and salted credential storage, clears login locks and revokes all admin sessions while preserving candidate sessions. Codes are single-use; changing the password while signed in also invalidates pending recovery. The reset form clears secret fields and returns to sign-in with an inline success message. Production needs all updated numbered files; older previews show a clear update-server message.
- Settings configure business timezone, buffers, UPI ID/QR, pricing and Calendar name. Admins change their password from the separate Change Password page.
- Create Booking shows and accepts Start/End in the Availability Business timezone (AVAILABILITY_TIMEZONE), falling back to the general business zone for legacy settings. Before adminCreateBooking is called, the client converts the selected interval to the general server input timezone, retaining identical UTC instants and adjusting the start date/overnight flag as necessary. Both source and target timezone conversions reject DST gaps/ambiguity; intervals that cannot be safely represented by the existing server contract are rejected. Form times remain in the schedule zone and existing server authorization, booking locks and availability checks remain authoritative. Create Booking supports selecting a candidate and administrator booking controls. Live search on Candidates, Bookings, Payments and Refunds matches related candidate/booking fields without replacing unsaved edit inputs. Search uses an accessible input without a separate visible heading. Candidate email and phone have separate columns; the Candidates table uses fixed column proportions within its card, vertically centered cells, consistent field heights and wrapping Save/Cancel spacing. Candidates fits its card without horizontal scrolling. Bookings uses an 1840px table with explicit widths for its twelve columns in a dedicated keyboard-focusable horizontal scroll region to give its twelve columns more room. Booking candidate names and IDs have spaced lines.

Candidate/admin table cells have more vertical spacing, centered vertical alignment and subtle row hover/focus feedback. Admin status toolbars show common states first and keep remaining states in More filters; all original status choices remain available. Overnight ends in booking and schedule tables show Next day with the end date.

Displayed dates throughout tables, summaries and styled date triggers use DD-MM-YY. Original date values remain YYYY-MM-DD and UTC internally so filtering, sorting and booking calculations are unchanged. Admin Blocked Schedules navigation is removed; candidate/public schedule views remain.

## In-page popups

App-authored notices, errors, cancellation confirmations and refund-reference prompts use a shared styled HTML dialog rather than native alert/confirm/prompt. Confirmations and prompts resolve asynchronously before mutations run; Cancel/Escape aborts them. Dialogs queue to avoid overlapping popups, use native dialog keyboard focus trapping, restore previous focus and escape displayed text. Unhandled app action rejections show an in-page notice. Error objects retain escaped stack details in an expandable Error details section, with URL query strings removed. Rejections whose stack points only to a browser extension remain in the browser console instead of becoming portal popups; errors with portal frames remain visible. Inline form messages remain inline. Local preview recovery codes use the same popup. Browser-owned permission/password-manager UI is outside the app dialog system.

Successful timezone and admin booking, candidate, payment, availability and settings saves show a small green notice after the save completes. The notice uses a polite status announcement, can be dismissed and disappears after four seconds. Password-change confirmations remain inline on the sign-in page. Notice animation respects reduced-motion preferences.

## Data model and statuses

Setup creates eight reserved tabs and adds missing columns while preserving existing/custom columns. Exact columns are defined in `01_Setup.js`; authentication columns are defined in `05_AuthSecurity.js`.

| Sheet | Stored data |
| --- | --- |
| `Candidates` | Identity/contact, account type/percentage, timezone, active flag, contact reference, timestamps, password and recovery fields |
| `AuthSessions` | Hashed session token, role, candidate/email identity, credential version and expiration |
| `InterviewsV3` | Booking/candidate IDs, identity snapshot, interview type, UTC endpoints/duration, candidate timezone, prices/payment amounts, percentage snapshot, statuses, UTR, Calendar reference, remarks and legacy source |
| `Payments` | Payment/booking/candidate IDs, expected/submitted USD amounts, UTR, submission/verification times and status/remark |
| `Refunds` | Refund/booking/candidate IDs, USD amount, requested/completed timestamps, status, refund reference and admin remark |
| `Settings` | Key/value configuration, including optional AVAILABILITY_TIMEZONE anchoring the saved schedule |
| `Availability` | Rule ID/type, weekday or date, start/end, enabled flag and note |
| `Audit Log` | UTC timestamp, actor, action, entity/ID and details |

Booking statuses include CONFIRMED and CANCELLED. Payment states include SUBMITTED, VERIFIED, FAILED and NOT_REQUIRED. Refund states include REQUESTED, REFUNDED and NOT_REQUIRED; failed-payment handling can reject a pending request. Candidate labels translate these codes to readable text. Public/profile projections exclude authentication secrets.

New candidate IDs use an `AV-` prefix and five-character suffix; booking/payment/refund/rule IDs use their prefix and six-character suffix. Existing IDs remain valid. Session tokens remain full-length secrets.

## Time, availability, pricing and reliability

Store booking endpoints as UTC; convert to candidate or configured business timezone for display/input. Business timezone defaults to America/New_York, while script timezone is Asia/Kolkata. Do not treat the historical `startIST` admin projection field name as proof that its value is IST: it uses configured business time. Valid timezone aliases such as Asia/Calcutta and non-preset zones are retained.

Date filtering uses calendar dates in the requested zone. Local-to-UTC conversion validates DST edge cases. Admin overnight booking requires explicit confirmation and advances the end date. Candidates cannot create overnight bookings in their selected timezone; a valid same-day booking may still cross midnight when displayed in another timezone, and its next-day date remains visible. Availability considers weekly windows, dated blocks, occupied bookings and before/after buffers. The default seeded working window is 12:00â€“20:00 every day in business time; both buffers default to 30 minutes.

Pricing defaults to started 60-minute blocks with a 30-minute short threshold, $50 short price and $70 long price: 30 minutes=$50, 40=$70, 90=$120, 100=$140. Regular candidates require payment; percentage accounts follow their separate server booking path and percentage snapshot. Currency defaults to USD. Settings are authoritative; do not hard-code production prices in UI.

Mutation locks serialize booking and other shared writes. Booking submission rejects stale quotes, past starts, overlapping slots, duplicate UTRs and invalid monetary values. Sheet updates preserve unrelated cells/formulas and store leading `=` inputs as literal text. Cancellation creates at most one refund request.

Calendar/email failure preserves the saved booking and queues pending work in Script Properties (`BOOKING_WORK_...`) with failure counts, last attempt timestamps and error details. The admin dashboard shows an amber Needs attention panel with a waiting count, individual and batch Try again controls, and a reminder that bookings are already saved. Each update shows its booking ID, type and failed-attempt count; See what happened expands the escaped error details. Invalid updates show Check this update rather than a retry button. When nothing is waiting, a compact green Everything is up to date panel appears. Batch retries process up to 10 oldest-attempt jobs; the panel lists up to 20 jobs and the full pending count. The admin RPC checks the admin role and runs under the existing lock. Owner-only `retryPendingBookingWork()` remains available from the editor. Calendar retries check booking markers; email retries can repeat a notification. Sheets, Calendar and email are not a single transaction. New Calendar references include calendar ID; legacy event-only references still depend on the original calendar setting.

## Authentication and access

Candidate passwords use salted PBKDF2-HMAC-SHA256 (600,000 iterations). Legacy candidate credentials migrate after successful password login. Admin credentials use the same salted PBKDF2 scheme in Script Properties (`ADMIN_PASSWORD_CREDENTIAL`, JSON containing salt/hash/algorithm/iterations). Existing `ADMIN_PASSWORD_HASH` credentials migrate after a correct admin login or password change, without changing the password; failed logins do not migrate. New setup writes the stronger credential directly. Password length is 8â€“1024 characters.

Session records store token hashes; the browser stores the bearer token in localStorage. Sessions last six hours and restore after refresh after server validation. Server role checks control all protected operations. Logout revokes the session. Candidate credential changes/deactivation invalidate earlier sessions; admin password change revokes admin sessions.

Recovery codes expire after ten minutes, allow five attempts, are single-use and have a one-minute resend interval. Five failed logins lock the relevant account for fifteen minutes. Recovery hashes use a server-only HMAC secret. Setup, schema migration, reset and editor retry maintenance require the active/effective Google user owner check. The dashboard retry RPC instead requires an authenticated administrator. Expired/revoked session rows are compacted under the authentication lock at most once per day when a session is issued; active sessions and custom columns are retained. See `AUTHENTICATION.md` for implementation detail.

## Local development and testing

Use `LOCAL_TEST_CASES.md` for the current pre-deployment test plan. It gives stable case IDs, browser/mock/HTTP/Excel methods, setup data, steps and expected results across visitor, candidate, admin, security, booking, payment/refund, timezone, availability, exports and owner maintenance. All checklist cases initially have Not run status; existing automated tests cover only their actual assertions, and renderer fixtures are not complete user journeys. Record results/evidence using its run template. Live Google delivery, authorization, quotas and real concurrency belong in a separate post-deployment plan. Do not restart the shared preview, change shared credentials or run destructive maintenance to prepare this checklist without authorization; use isolated mock processes for those checks. Maintain this checklist when behavior changes alongside this guide.

Run from the project root with Node available:

```powershell
node local-preview/server.cjs
```

Open `http://127.0.0.1:8787`. `PREVIEW_PORT` can override the port. The entry point keeps CSS and client helpers inline so raw HTML previews and existing preview processes receive complete styles/scripts without include expansion. Reload for HTML/CSS/client changes; restart for server-code changes or to reset seed data. The server listens only on loopback, allows client RPC names, rejects cross-origin browser RPCs, and uses a separate local-preview session-storage key.

| Preview account | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | Admin123! |
| Regular candidate | candidate@example.com | Candidate123! |
| Percentage candidate | maya@example.com | Candidate123! |

These are disposable preview credentials. Generated candidate IDs change on restart; use email to log in. Recovery codes appear in the shared in-page popup. No real Google data, payments, email, Calendar events or Contacts are created.

Run all tests (PowerShell-compatible, stopping on failure):

```powershell
Get-ChildItem tests/*.test.cjs | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Test failed: $($_.Name)" }
}
```

| Test | Coverage |
| --- | --- |
| `admin-compatibility.test.cjs` | Missing overview/page/choice API fallback, no authentication fallback, visible login/table failures and balanced loading state for a missing RPC method |
| `admin-export.test.cjs` | Genuine XLSX package, literal formula-like text and leading identifiers, numeric values, all filtered pages, private-field omission, admin-only UI and export size limit |
| `admin-recovery.test.cjs` | Admin recovery email/code privacy, expiry, resend throttling, attempt limit, delivery failure cleanup, one-time reset, password policy and role-specific session revocation |
| `admin-improvements.test.cjs` | Admin hash migration/reference check, payment reconciliation/audit and admin access, external-work failure/retry, global paginated sorting/search, session compaction and canonical timezone/time-format display |
| `admin-search.test.cjs` | Admin live search/edit behavior, candidate status/date-filter/sort rendering, timezone date boundaries and inclusive ranges, availability UI and business-date dashboard |
| `auth.test.cjs` | Schema/hash correctness, registration/login/recovery/session lifecycle, role enforcement, client restoration and mocked integrations |
| `availability-timezone.test.cjs` | Schedule anchoring, repeated business-timezone changes, unchanged booking eligibility, stale save protection, converted winter/summer times, full-day blocks and DST gap/overlap handling |
| `availability.test.cjs` | Rule cell types, timezone/date handling, blocks, overnight availability and durations |
| `booking-integrity.test.cjs` | Locks/validation, IDs, pending work, refunds, blocks, throttling and payment-input capture |
| `candidate-edit.test.cjs` | Admin contact edit access, atomic validation, uniqueness, phone normalization, session revocation and audit |
| `local-rpc.test.cjs` | Local direct RPC routing, broken Google bridge bypass, error/loading cleanup and production routing preservation |
| `pickers.test.cjs` | Leap-year/month date generation, AM/PM conversion, original-field event dispatch, focus restoration, timezone search/index preservation, preferred time formatting/account separation and SVG arrow regression |
| `public-bookings.test.cjs` | Public privacy projection, timezone boundaries, cancellation exclusion and DST |
| `reset.test.cjs` | Owner-only reset, cleanup, preserved unrelated data and setup after reset |

`local-preview/browser-check.cjs` can connect to an Edge page using remote debugging on port 9333. Its `connect(port=8787)` argument selects the preview port, including isolated test previews. Existing PNGs are historical screenshots, not automatic evidence of current UI. Local tests do not validate Google authorization, actual service delivery, quotas, deployed latency or real concurrent requests.

## Data loading and performance

The browser requests `getAdminOverview(token)` for global counts, settings, availability and queued-work status, then `getAdminPage(token, options)` for the active table. Table responses default to 50 rows and enforce a maximum of 100; options include kind, page, size, query, status, date/range, upcoming and sort. Each response includes the current business timezone/time, totals and only related page records. Booking creation fetches lightweight active candidate choices separately. Candidate authentication fields are never projected. The previous full dashboard API remains available for compatibility. If an older preview/deployment does not expose the overview, page or candidate-choice RPC, the UI falls back to the role-checked full dashboard API and renders its records. The normal updated backend still uses bounded pages. Authentication/network/data errors do not trigger the missing-function fallback. Sign-in failures remain visible on the login screen, table failures offer an inline retry, and synchronous missing RPC methods release the loading overlay. Older backends still need updating for the new server features.

Sheets still scans relevant tabs for global counts, filtering and sorting; pagination bounds transferred data and browser rendering rather than providing database indexing. Server joins use maps, and paged bookings skip redundant human-readable date projections. Candidate pages skip reading bookings. Extremely large datasets may still need a different storage strategy. No background trigger is installed.

## Production setup and maintenance

1. Use the existing Sheets-bound Apps Script project and upload all `00_`â€“`07_` server files, `Index.html` and `appsscript.json`. Local preview/tests/documentation are not production application files; `.claspignore` excludes preview/tests.
2. For a new installation, set `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` in Script Properties, run `runInitialSetup()` manually as owner, then remove those initialization properties.
3. For an existing authentication upgrade, run `upgradeCandidateAuthentication()` as owner; it preserves existing data/settings while adding authentication schema. See `AUTHENTICATION.md`.
4. Authorize required scopes: current spreadsheet, email sending, Calendar, Contacts and user identity. The manifest enables Advanced People API v1.
5. Configure actual business timezone, availability, buffers, pricing, notification email, UPI/QR and Calendar. QR supports HTTPS image URLs or Drive image file links; Drive sharing must permit image access.
6. Update the web-app deployment and perform deployed registration/login/recovery/refresh/logout, booking/payment/refund, Calendar and contact smoke checks.

`migrateLegacyInterviews()` imports compatible legacy rows while tracking source rows to avoid duplication. `resetInterviewPortalForTesting()` permanently deletes the eight portal tabs and portal authentication/pending-work properties. It preserves unrelated tabs/properties and external Calendar/Contacts; it is a destructive owner-only maintenance command, never a routine fix. Reinitialization does not remove orphaned external events/contacts.

## Change history

### 2026-10-10 â€” Dashboard cleanup and clickable metrics

- Removed the Confirmed bookings heading, standalone date calendar and timezone captions; retained table date columns and date-filter controls. Converted live metric cards into keyboard-accessible navigation buttons with matching upcoming/payment/refund filters.
- Files: `Index.html`, `tests/admin-search.test.cjs`, `PROJECT_GUIDE.md`. Targeted UI checks passed, including destinations and status filters. Local Edge verified removed elements and all four card destinations without uncaught exceptions. All seven local test files passed. No production deployment performed.

### 2026-10-10 â€” Admin UI parity

- Added matching status/date controls to Bookings, Payments and Refunds, plus date shortcuts/ranges on the confirmed-bookings dashboard. Split admin booking times into Date/Start/End and added refund badges. Filters use business dates and combine with existing search.
- Added sortable headers to dashboard, booking, candidate, payment and refund tables. Sorting moves existing rows rather than recreating edits. Added matching status colors, metric/table hover effects, reduced-motion support and styled remaining admin selects. Retained the fixed desktop layout and existing privileged actions.
- Files: `Index.html`, `tests/admin-search.test.cjs`, `PROJECT_GUIDE.md`. Full seven-file local suite passed; additional admin date/status/numeric-sort checks passed. Local Edge verified status filtering, range-calendar enhancement, Tomorrow selection, all affected admin pages and preservation of an unsaved charge during sorting, without uncaught exceptions. Screenshot: `local-preview/browser-admin-ui.png` (captured before the final date/time nowrap adjustment). No production deployment performed.

### 2026-10-10 â€” Separate admin password page

- Added Change Password to desktop admin navigation and the retained mobile menu, matching the candidate navigation. The shared password form and reauthentication flow are now on that page instead of embedded beneath Settings.
- Updated `tests/auth.test.cjs` to verify both admin navigation entries and that Settings no longer renders the password form.
- Files: `Index.html`, `tests/auth.test.cjs`, `PROJECT_GUIDE.md`. Full local test suite run; no production deployment or browser verification performed.

### 2026-10-09 â€” Candidate dashboard columns and status filtering

- Split the long combined time cell into Date, Start and End; show end date for overnight interviews.
- Converted display-only payment/refund badges into working filters with All, selected state and empty results.
- Updated responsive column labels and added regression checks in `tests/admin-search.test.cjs`.
- Files: `Index.html`, `tests/admin-search.test.cjs`. All six local test files passed. No production deployment performed.

### 2026-10-09 â€” Sorting, navigation feedback and agent handoff

- Removed the My Interviews heading. Added sortable data-column headers with direction indicators, numeric/time/date sorting, filter compatibility and visible controls on smaller screens.
- Added navigation hover/press/underline effects and candidate/admin active-page indicators; reduced-motion preferences disable navigation animation.
- Added this project guide and root `AGENTS.md` requiring future agents to update the guide and change history in each implementation task.
- Files: `Index.html`, `tests/admin-search.test.cjs`, `PROJECT_GUIDE.md`, `AGENTS.md`. All six local test files passed; added sorting/filter compatibility and active navigation checks passed. Local preview returned HTTP 200. Browser visual inspection was unavailable because the Edge debugging endpoint was not running. No production deployment performed.

### 2026-10-09 â€” Reliable arrows and styled input pickers

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

### 2026-10-10 - Admin layout cleanup, payment correction and date display

- Removed admin Blocked Schedules navigation and redundant admin content/book-form headings. Moved the unlabeled time-format selector to the shared header; converted dashboard Refresh to an icon, aligned range errors below date controls, increased table spacing and separated candidate email/phone columns. Displayed dates use DD-MM-YY while canonical values remain unchanged.
- Added Change/Save/Cancel on verified payments. Extended the existing locked adminVerifyPayment API to allow pending/failed corrections, synchronize booking/refund state and clear verification timestamps; completed refunds remain protected. Clarified the existing after-midnight checkbox in candidate/admin forms.
- Files: `Index.html`, `04_Admin.js`, `tests/admin-search.test.cjs`, `tests/auth.test.cjs`, `tests/booking-integrity.test.cjs`, `tests/pickers.test.cjs`, `PROJECT_GUIDE.md`. All seven local test files passed; extra date-format checks passed. Local Edge verified header placement, removed headings/navigation, DD-MM-YY table dates, payment editor and overnight checkbox visibility without uncaught exceptions. Payment transitions and refund protection were validated in mocks, not live Google Sheets. Screenshot: `local-preview/browser-admin-cleanup.png`. No production deployment performed.

### 2026-10-10 - Header switch visibility, styled controls and contact editing

- Made the header 12/24-hour switch always visible. Redesigned Refresh as a compact blue icon button and styled payment Change/editor/Save/Cancel controls. Added admin editing of candidate email/phone with atomic validation, uniqueness checks, recovery cleanup and session invalidation when email changes.
- Files: `Index.html`, `04_Admin.js`, `tests/candidate-edit.test.cjs`, `PROJECT_GUIDE.md`. All eight local test files passed after correcting an authorization-message expectation in the new test. Local Edge verified header visibility, 38px refresh dimensions, enabled contact fields and styled payment editor with no uncaught exceptions. Screenshot: `local-preview/browser-payment-editor.png`. Contact-update persistence/security tested against mocks only. No production deployment performed. Restart the local server for the new candidate-update server code.

### 2026-10-10 - Candidates table alignment

- Added fixed column proportions and centered cells; normalized row/field heights, readonly field styling and action spacing so view/edit modes stay aligned.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Existing UI checks passed. Local Edge verified middle alignment across all eight columns, working edit controls and no uncaught exceptions; screenshot visually inspected: `local-preview/browser-candidates-aligned.png`. No production deployment performed.

### 2026-10-10 - Replace native dialogs with in-page popups

- Replaced all app-authored native alerts/confirmations/prompts in candidate/admin flows and the local-preview reset-code notice with a queued, accessible styled dialog. Cancellation/refund actions wait for user input; Escape/Cancel exits safely. Added error-rejection handling and no-native-dialog regression checks.
- Files: `Index.html`, `local-preview/shim.txt`, `tests/pickers.test.cjs`, `PROJECT_GUIDE.md`. Local Edge verified Confirm/Cancel values, reference input, Escape dismissal, zero native dialogs and no uncaught exceptions. Screenshot: `local-preview/browser-app-dialog.png`. All eight local test files and the added no-native-dialog checks passed. No production deployment performed.

### 2026-10-10 - Sorting, payment consistency, admin security and paged UI

- Fixed editable candidate-field sorting; synchronized admin booking amount/reference corrections with payments and incomplete refunds; retained admin-only payment authority with before/after audit records and correction reasons. Added salted admin credentials with verified legacy migration and daily expired-session compaction.
- Added a styled pending email/calendar panel with role-checked individual/bounded batch retries and persisted failure details. Admin tables now load 50-row pages with global search/filter/sort; draft rows and search focus are preserved. Extracted Styles, ClientTime and ClientAdmin HTML partials and updated preview/test include expansion. Dates/times now render from UTC using the viewer timezone and per-account 12/24-hour preference, updating only marked elements.
- Files: `00_Config.js` through `07_AdminData.js`, `Index.html`, `Styles.html`, `ClientTime.html`, `ClientAdmin.html`, `local-preview/read-ui.cjs`, preview server/browser helper, tests, `PROJECT_GUIDE.md`, `AUTHENTICATION.md`, `BOOKING_FIXES.md` and preview README.
- Validation: all nine local test files passed. Additional paged-server checks passed for DD-MM-YY search, inclusive ranges and timezone date boundaries after the final date-search optimization. Local Edge on an isolated mock preview with 113 candidates verified separate 50-row pages, candidate email sorting, retained edits across sorting/navigation, payment amount reconciliation, a successful admin retry, both admin time formats and candidate 24-hour display, with no uncaught errors or native dialogs. Screenshots inspected: `local-preview/browser-admin-retry-panel.png`, `local-preview/browser-admin-payment-reason.png`, `local-preview/browser-candidate-canonical-times.png`. No production deployment or live Google verification. Sheets scans and at-least-once email retry limitations remain; no retry trigger was installed. Restart existing preview servers to load the updated partial expansion/server code.

### 2026-10-10 - Restore self-contained CSS and client scripts

- Fixed the unstyled page served by an already-running preview: its older server read Index.html directly and left the new Apps Script include markers unexpanded. Restored the current CSS and shared time/admin code inline in Index.html and removed the three extracted partial files. This retains the sorting, payment, security, paging, retry and time-format improvements while restoring compatibility with raw HTML previews and deployments that upload Index.html. New server behavior still requires restarting existing preview processes.
- Files: `Index.html`, removed `Styles.html`/`ClientTime.html`/`ClientAdmin.html`, `tests/admin-improvements.test.cjs`, guide/authentication/booking/preview documentation. All nine local test files passed, including an added regression check requiring inline CSS and no unexpanded client includes in the raw entry point. The already-running preview at port 8787 served complete CSS and valid client code without a restart. Local Edge verified applied styles, hidden sections, available shared helpers and zero uncaught errors/native dialogs; screenshot visually inspected: `local-preview/browser-restored-inline-css.png`. No live deployment or Google service verification.

### 2026-10-10 - Restore admin loading against older preview backends

- Reproduced an empty admin page on the existing port-8787 preview: getAdminOverview returned Unsupported preview operation and its error was written to the already-hidden login screen. Added narrow missing-function compatibility fallback to getAdminDashboard for overview/page/candidate-choice loading. Admin sign-in failures now show the login screen and table failures show an inline Retry action. Synchronous RPC startup failures clear the loader. Existing records are preserved; no preview restart/reset or deployment was performed.
- Files: `Index.html`, `tests/admin-compatibility.test.cjs`, `PROJECT_GUIDE.md`. All ten local test files passed, including missing-function/loading/error-visibility regressions. Local Edge verified the restored dashboard and Bookings, Candidates, Payments, Refunds, Settings, Availability and Create Booking on the already-running older preview, with no uncaught errors/native dialogs. Screenshot: `local-preview/browser-admin-restored.png`. New backend-only features still require the updated numbered server files; the legacy fallback transfers the full dashboard dataset. No live Google verification.

### 2026-10-10 - Hide repeated same-day candidate End dates

- Fixed a mixed-projection comparison: canonical start dates were DD-MM-YY while an older server supplied human-readable end dates, so equal calendar dates appeared different. Normalize both dates before deciding whether End needs a date. Real overnight end dates remain visible in both 12/24-hour modes.
- Files: `Index.html`, `tests/admin-improvements.test.cjs`, `PROJECT_GUIDE.md`. Local admin-improvements, admin-search and picker tests passed, including same-day/overnight cases with mixed and canonical endpoints. Local Edge renderer fixtures verified same-day suppression and overnight retention in both formats, with no uncaught errors; screenshot inspected: `local-preview/browser-candidate-end-date-fixed.png`. This was a browser renderer check, not an authenticated candidate walkthrough or deployed Google verification. No credentials, records or deployment were changed.

### 2026-10-10 - Six UI trial improvements

- Reduced the candidate profile card, clarified overnight ends with Next day/date labels, increased table row spacing and hover feedback, moved uncommon statuses into More filters, added candidate empty-state actions, and added nonblocking success notices to timezone and admin saves. Existing status choices, sorting, timezone conversion and server permissions are preserved.
- Files: `Index.html`, `PROJECT_GUIDE.md`. All ten local test files passed. Local Edge renderer fixtures verified the compact profile, overnight label, candidate/admin extra-status filtering, empty-state navigation, and save-notice announcement/dismissal with no uncaught errors or native dialogs. Screenshots visually inspected: `local-preview/browser-ui-trial-candidate.png` and `local-preview/browser-ui-trial-admin.png`. Browser checks injected display fixtures; they did not verify authenticated saves or live Google services. No deployment, credential changes or data resets were performed.

### 2026-10-10 - Admin attention box UI trial

- Redesigned the existing pending email/calendar box with amber attention styling, clearer Try again actions and expandable error details; the clear state uses green styling. Retry APIs, batch limits and admin permissions remain unchanged.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Local admin-improvements and admin-compatibility tests passed. Local Edge renderer fixtures verified pending rows, collapsed/expanded error details and zero uncaught errors/native dialogs; screenshot visually inspected: `local-preview/browser-admin-attention-trial.png`. These were display fixtures, not authenticated retry or live Google checks. No deployment or data changes performed.

### 2026-10-10 - Candidate same-day booking restriction

- Removed the candidate after-midnight checkbox. Candidate time changes show an accessible inline error when end is earlier than or equal to start; invalid times cannot request a quote. Candidate server quote/submission validation enforces the same local-day restriction regardless of a supplied overnight flag. Admin overnight creation and cross-timezone next-day displays remain available.
- Files: `Index.html`, `03_Bookings.js`, `tests/auth.test.cjs`, `tests/availability.test.cjs`, `PROJECT_GUIDE.md`. All ten local test files passed, including candidate quote/submission rejection with either overnight flag, no booking writes on rejection, equal-time rejection, and retained admin overnight creation. Local Edge form fixtures verified the removed candidate checkbox, inline reversed-time error, correction clearing the error and retained admin checkbox with no uncaught errors. Browser checks did not submit real bookings. No deployment or live-data changes performed. Updated server behavior requires deploying all numbered server files or restarting an outdated mock preview.

### 2026-10-10 - Availability time-field format correction

- Fixed shared time-field trigger labels, which always showed AM/PM even after selecting 24 hours. Availability and other time inputs now show the chosen format without modifying their canonical values or form drafts.
- Files: `Index.html`, `tests/pickers.test.cjs`, `PROJECT_GUIDE.md`. Picker, admin-search and availability tests passed, including 13:05, midnight and switching back to 12 hours. Local Edge admin Availability fixtures verified both formats and preserved input values. No live saves or deployment performed. The timezone behavior was subsequently clarified and addressed in the following entry.

### 2026-10-10 - Preserve and display availability across timezone changes

- Added the AVAILABILITY_TIMEZONE settings anchor on availability save or the first business-timezone change. Booking eligibility continues to use the saved schedule zone. Admin Availability shows a converted table in the current business timezone with both endpoint dates, a reference-week selector for DST-aware weekly rules, full-day block conversion, and an expandable original-zone editor. Saves reject a supplied stale source timezone. Shared 12/24-hour formatting applies to the converted table and source fields.
- Files: `03_Bookings.js`, `04_Admin.js`, `Index.html`, `tests/availability-timezone.test.cjs`, `PROJECT_GUIDE.md`. All eleven local test files passed, including the new schedule-preservation and DST conversion regressions. Local Edge renderer fixtures verified New York-to-India conversion, next-day ends, both time formats, summer-week changes and unchanged original editor values, with no uncaught errors/native dialogs. Screenshot visually inspected: `local-preview/browser-availability-timezone.png`. Browser checks did not save data; server checks use mocks. No deployment or live Google verification. Upload all numbered server files for production; restart outdated preview processes for server changes. Existing pre-anchor timezone history cannot be recovered automatically; weekly conversions are week-specific and edits remain in the saved source zone.

### 2026-10-10 - Remove Note from admin Availability

- Removed the visible Note input from rule editing and the Note column from the converted availability table. Existing saved notes remain in hidden inputs so saving other rule changes does not erase them. Adjusted the conversion-error row span for the shorter table.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Local admin-search, availability-timezone and picker tests passed. No browser walkthrough or deployment performed for this change.

### 2026-10-10 - Updated preview for admin availability troubleshooting

- Confirmed the existing port-8787 preview still runs an older backend: getAdminOverview returns Unsupported preview operation even though its served UI includes the new availability and hour-format helpers. Started a separate updated mock preview at http://127.0.0.1:8790, leaving the original preview process and its records untouched. This separate preview has disposable fixture data.
- No application source changes. Updated `PROJECT_GUIDE.md`. Verified the new server through authenticated local RPCs: saved availability, changed business timezone, and confirmed the original availability zone and clock values remain preserved. An initial test using the wrong source zone was correctly rejected by the stale-source guard; the corrected test passed. No deployed Apps Script or live Google verification. Restarting the original preview would discard its in-memory edits, so it was not restarted.

### 2026-10-10 - Candidates width and safe Availability editing

- Removed the admin Candidates table minimum width, sized percentage inputs to their column and allowed action buttons to wrap. Added a bottom Edit control to Availability; fields and Add/Remove are locked initially. Edit unlocks source-zone rule editing, Save retains timezone handling and hidden notes, and Cancel rebuilds saved values. The converted timezone preview remains readable without editing.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Local admin-search, availability-timezone and picker tests passed. Local Edge renderer fixtures on port 8787 verified locked initial fields, Edit unlocking, Cancel restoring and relocking, converted dates, and no horizontal overflow within Candidates. No uncaught browser errors observed. No authenticated save, deployment or original preview restart performed. The original port-8787 backend remains outdated, so server-side schedule timezone preservation still requires the updated numbered server files; restarting that disposable preview would erase its in-memory changes.

### 2026-10-10 - Independent availability zone and admin layout cleanup

- Replaced the converted current-timezone view with a dedicated editable Availability Business timezone selector: all rule hours follow that saved zone regardless of other timezone choices. Added server validation, atomic locked rule-save workflow and a capability flag/old-backend guard. Kept initial editing locks; aligned Edit beside Add Rule, styled the timezone card and compact rule rows, preserved notes and enabled states. Removed internal scrolling/minimum table widths across the five main admin tables, allowing long text and payment editors to fit their columns. Fixed older conflicting availability grid CSS during visual review.
- Files: `Index.html`, `04_Admin.js`, `07_AdminData.js`, `tests/availability-timezone.test.cjs`, `PROJECT_GUIDE.md`. All eleven local test files passed, including independent timezone validation/save and booking eligibility. Local Edge renderer fixtures verified five admin tables without internal horizontal overflow, adjacent Add/Edit controls, timezone locking, Cancel restoration and the old-server save guard. Browser checks were repeated after the final grid CSS correction; screenshot inspected: `local-preview/browser-admin-availability-business-zone.png`. No live save, deployment, credential changes or reset of the original port-8787 preview performed. Its old backend still requires updating to persist the independent zone. Fixed desktop mode still permits page-level horizontal scrolling on windows narrower than 1365px; picker lists retain scrolling for long options.

### 2026-10-10 - Close the separate preview

- Stopped the agent-started port-8790 test preview at the user's request. Kept the original port-8787 preview running; its in-memory records were not reset. Current preview for this session: http://127.0.0.1:8787/.
- Validation: HTTP check confirmed 8787 responds and 8790 no longer responds. No application source changes or deployment performed. The original backend still needs updating for recent server features.


### 2026-10-10 - Complete the requested admin To do box

- Corrected the incomplete attention-box implementation: the prior panel only covered failed external work and disappeared on the older preview. Added a To do section with actionable pending-payment/refund counts and failed-update status, while retaining external-work details/retries where supported.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Local admin-search and admin-improvements tests passed. HTTP checks confirmed port 8787 serves all seven UI feature markers. Local Edge renderer fixtures verified To do counts, compact candidate details, More filters, empty-state action and save notice, without uncaught errors. These were fixtures, not authenticated saves. Native status on the old backend remains unavailable until updated; no restart, data reset or deployment performed.

### 2026-10-10 - Local RPC hardening after reported M_ID popup

- Investigated the reported popup during dashboard refresh/timezone changes. The exact M_ID identifier is absent from project source, and an authenticated dashboard read on the existing 8787 server succeeded. Added direct loopback /rpc transport for marked local previews, bypassing the Google bridge; production transport remains unchanged. Added regression coverage and adjusted the compatibility test extraction to include the routing helper.
- Files: `Index.html`, `tests/local-rpc.test.cjs`, `tests/admin-compatibility.test.cjs`, `PROJECT_GUIDE.md`. All twelve local test files passed. Local Edge verified an authenticated refresh on 8787 with a deliberately injected M_ID failure in the Google bridge; timezone selection and Cancel also worked without uncaught errors. No settings writes, original preview restart or deployment performed. The original user error was not reproduced naturally, so its root cause remains unconfirmed; this change removes reliance on the bridge in local preview. Independent availability timezone persistence still requires the updated backend.


### 2026-10-10 - Restore scrolling for admin Candidates

- Restored horizontal scrolling only for the Candidates table at the user request, with a 1480px minimum width and a styled, keyboard-focusable scroll region. Other admin tables retain their existing layout.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Local admin-search tests passed. Local Edge renderer fixtures confirmed the scroll region overflows horizontally, scrollLeft changes and overflow-x is auto. No authenticated edits or deployment performed.

### 2026-10-10 - Admin forgot-password recovery

- Added admin sign-in Forgot password and a styled email/code/new-password form. Added locked admin recovery APIs with registered-email-only delivery, hashed single-use codes, ten-minute expiry, five failed attempts and one-minute resend throttle. Successful reset updates salted credentials and revokes only admin sessions; signed-in password changes clear pending codes. Owner testing reset also clears ADMIN_PASSWORD_RESET. The disposable preview can show admin recovery codes via its existing in-page reset notice; production never returns codes.
- Files: `02_AuthCandidates.js`, `01_Setup.js`, `Index.html`, `local-preview/server.cjs`, `tests/admin-recovery.test.cjs`, `tests/reset.test.cjs`, `PROJECT_GUIDE.md`, `AUTHENTICATION.md`. All thirteen local test files passed. Picker checks and the expanded owner-reset cleanup check were also rerun after the final UI/reset-test refinements. Local Edge form fixtures verified email prefill, code step, password mismatch, inline reset success and cleared secret fields with mocked RPC; no uncaught errors. No password changes on the original preview or live data, email delivery, deployment or server restart were performed. Port 8787 still needs the new backend to perform recovery.

### 2026-10-10 - Diagnose recurring M_ID popup

- The user reports the popup persists after the local-transport change. Its natural origin remains unconfirmed. Preserved error objects in alert paths and added escaped, expandable stack details (URL query strings stripped) to identify the source. Global rejection handling now avoids portal popups for stacks originating solely in browser extensions; portal-origin errors remain visible.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Local picker and admin-compatibility tests passed. Local Edge verified error-details expansion and extension-versus-portal stack classification with injected errors. No natural M_ID reproduction, live settings edits, restart or deployment performed; further diagnosis needs the details from the user popup.

### 2026-10-10 - Restart original preview with current server code

- At the user explicit approval to discard temporary test data, stopped the verified Node process listening on 8787 and restarted local-preview/server.cjs on the same port with the current numbered server files. No separate preview was started. This recreates sample data and invalidates previous preview sessions; sign in again. Prior old-backend limitations at 8787 in earlier history entries no longer describe the current process.
- Validation: authenticated local RPCs confirmed the updated admin overview capability, successful independent availability timezone saves, and unchanged schedule timezone after general BUSINESS_TIMEZONE changes. Restored sample rule values and the original sample business/schedule zones after the check, then logged out the test session. No live Google data, deployed settings or credentials were changed. Windows required elevated process-stop access for the approved restart; it succeeded.

### 2026-10-10 - Move horizontal scroll from Candidates to Bookings

- Removed the dedicated Candidates scrollbar/minimum width and moved the styled, keyboard-focusable horizontal scroll region to admin Bookings with a 1480px table width.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Local admin-search tests passed. Local Edge renderer fixtures verified Candidates fits its card and Bookings overflows and scrolls horizontally. No server restart, data changes or deployment performed.

### 2026-10-10 - Create Booking follows Availability timezone

- Fixed Create Booking using the general Settings timezone rather than the separately saved Availability Business timezone. The form now displays the schedule zone; a client conversion helper maps the entered interval to the existing server input zone without changing its UTC endpoints. Handles shifted start dates/overnight ends and rejects ambiguous clock-change conversions. No server API changes or restart needed.
- Files: `Index.html`, `tests/availability-timezone.test.cjs`, `PROJECT_GUIDE.md`. All thirteen local test files passed, including added cross-timezone date/midnight and DST conversion regressions. Local Edge fixtures verified the form timezone, correct converted booking payload across midnight and unchanged user-entered times with mocked RPC. No bookings/settings were written to the running preview or live Google services; no data reset or deployment performed.

### 2026-10-10 - Repair Bookings column spacing

- Replaced equal-width Bookings columns with explicit widths totaling 1840px, giving candidate names, status badges, overnight dates and action buttons adequate space. Increased cell padding, kept date/time labels together and normalized button spacing while retaining horizontal scrolling.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Local admin-search tests passed. Local Edge renderer fixtures verified twelve column widths, 1840px table layout and horizontal scrolling without uncaught errors. Screenshot inspected: `local-preview/browser-bookings-css-fixed.png`. No real booking edits, server restart or deployment performed.

### 2026-10-10 - Payment editor Cancel and simpler controls

- Fixed Cancel re-opening the payment editor because it was captured/restored as a draft during page reload. Cancel now clears that payment draft and restores Change directly without a request. Status selection starts on the saved status. Removed the reason field and Update payment status label as requested; corrections automatically record previous/new statuses in the server remark/audit, retaining role/refund protections. Draft detection includes the editor after its reason input removal.
- Files: `Index.html`, `PROJECT_GUIDE.md`. Local admin-search and admin-improvements tests passed. Local Edge fixtures verified current FAILED selection, absent reason/label, draft retention while editing, draft deletion on Cancel, no reopening after rerender, and automatic audit text on a mocked save. No uncaught errors observed. No real payment mutation, server restart or deployment performed.

### 2026-10-10 - Filtered admin Excel export

- Added styled Export Excel controls to the five admin table views. Exports current filters/search/sort across all pages via existing role-checked getAdminPage calls, with a 10,000-row bound and change-detection checks. Added dependency-free XLSX ZIP/XML generation with styled/frozen headers, Excel filters, safe literal text and numeric amounts; includes local start/end dates and timezone. Legacy search state now updates for consistent cached export. No server changes/restart needed.
- Files: `Index.html`, `tests/admin-export.test.cjs`, `PROJECT_GUIDE.md`. All fourteen local test files passed. New export tests cover package parts, formula-like strings as literal text, numeric values, private-field omission, 101 rows across two pages, admin-only UI and limit handling. Independent .NET ZIP/XML checks opened every sample workbook part. Local Edge renderer fixtures downloaded a filtered Payments workbook; independent inspection confirmed exactly two VERIFIED rows. Screenshot inspected: `local-preview/browser-admin-excel-export.png`; test workbooks: `local-preview/admin-export-test.xlsx` and `local-preview/payments-2026-10-10.xlsx`. No native Excel application opening, live Google verification, real data writes, restart or deployment performed. Concurrent updates are not a transactional snapshot; stable totals/IDs can still contain values edited during export. Dates/times are display text in Excel, not serial date cells.


### 2026-10-10 - Current local test checklist

- Added `LOCAL_TEST_CASES.md` with 209 uniquely identified cases covering every current module, important boundaries/security failures, earlier user-reported regressions and seven complete local journeys. Includes setup data, browser/mock/HTTP/Excel methods, expected results, run-report template, existing fourteen-script mapping, known limitations and separate post-deployment exclusions. Cases are Not run by default; no execution claims inferred from the plan. Added file-map and testing-workflow guidance here; agents should maintain both documents as behavior changes.
- Files: `LOCAL_TEST_CASES.md`, `PROJECT_GUIDE.md`. Validation: Node documentation checks verified unique case IDs, four-column case tables, exact mapping of all fourteen current test scripts, and guide references. No application code changed; automated application suite and browser journeys were not rerun for this documentation-only task. No server restart, data/credential changes, live service calls or deployment performed. Full checklist execution remains future work.
