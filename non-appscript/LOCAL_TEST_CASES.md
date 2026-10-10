# Manual website walkthrough test cases

Updated: 10-10-2026. Target: http://127.0.0.1:8787/ ? current local website, before deployment.

## Instructions for the testing agent

When asked to execute this plan, open the actual website in a browser and test it like a person: click buttons, fill forms, select dates, change visible options, navigate, refresh and inspect results. Browser-control tools may perform these real interactions. Do not replace this walkthrough with Node tests, direct API/RPC calls, injected sample screens, edited browser storage or source-code assertions. Do not run JavaScript to bypass the visible form or manufacture a passing result.

This file is a plan, not a completed report. Every case starts **Not run**. When a run is requested, continue through every accessible case, then create WEBSITE_TEST_REPORT.md and give the user a simple summary. If browser access is unavailable, say so; do not pretend to have tested the website.

Read `../AGENTS.md` and `../PROJECT_GUIDE.md` first. Use the existing server and confirm LOCAL TEST DATA ONLY. Do not deploy, restart/reset the preview or start another server. Use seed logins from `local-preview/README.md` without copying passwords/codes into the report.

Register dedicated QA candidates through the website, with unique names/emails and references such as QA-101026-001. Only mutate QA bookings, payments, refunds and contact details. Record all QA record IDs. For candidate password checks, use your QA account. Do not change/reset the shared admin password without explicit permission; mark those successful-mutation variants Blocked and continue other tests.

Before changing shared Settings or Availability, capture original visible values and rules. During an authorized walkthrough make only needed test changes, then restore the originals through the UI. List any un-restored change in the report. Do not reset data as cleanup.

For each row, record exact inputs, actual observations, status and evidence. Where a row lists several options/fields, test every option and record sub-results. Partially checked cases cannot be Pass. A success toast alone is not proof: revisit the saved row and refresh, comparing candidate/admin views when relevant. Capture screenshots for failures/key journeys, without secrets. Do not fix implementation during the test run unless asked.

## Preparation through the website

1. Inspect welcome page; register a regular QA candidate and note its ID. Use email login because IDs change on server restart.
2. Inspect admin pages, saved zones, hours, buffers and prices. Capture original Settings/Availability before changes.
3. Pick a future free interval inside schedule-zone working hours and outside occupied buffers. Use actual saved pricing. If testing default pricing deliberately, 30 minutes=$50, 40=$70, 90=$120, 100=$140.
4. Create QA bookings/payment/refund states using the actual forms. Change QA account type through Admin Candidates when testing percentage accounts. Do not invent UI controls that are not present.
5. Use New York/Kolkata/UTC for timezone checks. Account for actual date's DST: New York winter 12:00 is Kolkata 22:30; summer 12:00 is Kolkata 21:30.
6. Use separate browser profiles for candidate/admin where available; otherwise log out and switch roles. Record cases needing multiple simultaneous sessions as Blocked if unavailable.
7. Run journeys, edge/visual checks and export checks. Restore shared configuration, log out, then write the report.

Every case below uses visible browser controls only. Conditional checks need the stated records, date, permission or spreadsheet viewer. Missing conditions mean **Blocked**, not Pass. Do not create hundreds of records or manufacture failures outside the UI just to force a condition.

## Browser cases

## 1. Preview and shared navigation

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| ENV-01 | Open 8787 and reload after an HTML edit in a disposable copy. | Complete styled UI, local banner and current HTML; no missing styles/scripts. |
| ENV-06 | Fail a request, including synchronous missing method and invalid JSON response. | Loading overlay/buttons recover; visible error; next valid action works. |
| NAV-01 | Visit every candidate and admin tab; return to Dashboard. | Correct content and active tab; no duplicate panels or uncaught errors. |
| NAV-02 | Hover, focus and press tabs, metric cards, Refresh and Logout. | Visible feedback; Logout uses its exit-arrow effect; actions remain clickable. |
| NAV-03 | Enable reduced motion and repeat navigation/toast/refresh. | Functionality remains; motion is reduced or disabled. |
| NAV-04 | Resize below 1365px and use a large desktop window. | Fixed desktop canvas remains; smaller viewport can scroll horizontally. No accidental responsive card conversion. |
| NAV-05 | Sign out, reload, and use Back. | Protected operations require a valid session; no usable stale signed-in page. |

## 2. Registration, login and sessions

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| AUTH-01 | Register valid QA name/email/phone/timezone and matching password. | One candidate with AV-prefixed ID and correct visible contact/profile fields. |
| AUTH-02 | Blank required fields; invalid email; invalid/incomplete international phone; invalid timezone. | Clear validation; no partial candidate/session created. |
| AUTH-03 | Repeat registration using email with different case/whitespace; use admin email. | Duplicate/reserved email rejected; no duplicate record. |
| AUTH-04 | Password mismatch; lengths 7, 8, 1024 and 1025 characters. | UI rejects mismatch; server permits policy boundaries 8–1024 and rejects outside them. |
| AUTH-05 | Name with Unicode/quotes/HTML-looking text. | Text preserved safely; no HTML execution or broken table. |
| AUTH-06 | Log in by candidate email and by generated ID. | Both identify the same account; correct role and profile. |
| AUTH-07 | Wrong password, unknown identifier, candidate credentials on admin login and reverse. | Login fails without revealing password data or granting the wrong role. |
| AUTH-11 | Refresh with valid token, expired six-hour token, revoked token and malformed token. | Valid session restores; others return to login safely. |
| AUTH-12 | Log out; reload and use browser Back; try any visible protected action on cached page. | No usable signed-in operation after logout. |
| AUTH-14 | Two local tabs; logout in one then make protected request in the other. | Server rejects revoked token even if the other tab still displays cached UI. |

## 3. Candidate and admin password recovery/change

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| PASS-01 | QA candidate: Forgot password with matching identifier/email; request local code. | Local in-page notice appears; recovery form usable. Live delivery/internal storage not checked. |
| PASS-03 | Open Admin login ? Forgot password. Enter blank/malformed email first, then configured admin email and request local code. Do not complete shared password reset without permission. | Styled in-page email/code/password form; mock delivery only to admin account. |
| PASS-08 | QA candidate: reset with valid local code, then reuse that code and try old/new login. Admin reset is conditional on explicit permission. | Code single-use; old password fails; new password works. |
| PASS-11 | Wrong current password; new-password mismatch; short/long password on Change Password. | Inline validation/error; credentials unchanged. Both roles. |
| PASS-12 | QA candidate: complete signed-in password change, then test old/new login. Admin successful change is conditional on permission; otherwise mark that variant Blocked. | Pending code invalidated; session cleared; inline success on sign-in screen. |
| PASS-14 | Back/Cancel recovery, navigate away, reopen; dismiss code notice. | Secret fields cleared appropriately; no native alert/prompt/confirm. |

## 4. Visitor and candidate blocked schedules

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| PUBLIC-01 | Load public schedules for a valid date/zone without signing in. | Confirmed occupied intervals only; no candidate ID/name/email/phone, booking ID, money/reference or secrets. |
| PUBLIC-02 | Query date with no interviews; invalid date/zone; 31 February. | Friendly empty result or clear validation; impossible dates rejected. |
| PUBLIC-04 | Change New York to Kolkata and UTC for the same booking. | Correct local dates/times; UTC interval unchanged. |
| PUBLIC-06 | Sort Status/Date/Start/End, toggle directions, refresh. | Chronological ordering, highlighted SVG arrows and aria-sort; sort persists per table. |
| PUBLIC-07 | Change welcome sort, then candidate blocked-schedule sort. | Independent sort state; no saved record changes. |
| PUBLIC-08 | View spring/fall DST dates and toggle 12/24 hours. Use a future transition date for booking forms; a past-time rejection does not prove DST handling. | Correct local offsets and displayed hours; no assumed 24-hour day boundary. |

## 5. Candidate dashboard and profile

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| CAND-01 | Open profile/dashboard with long name and all payment/refund states. | Compact ID/account/timezone row; readable badges and aligned Date/Start/End columns; no My Interviews heading. |
| CAND-02 | Load one candidate's home with another candidate's bookings present. | Only signed-in candidate's profile/interviews; private auth fields absent. |
| CAND-03 | Profile initial state, Edit, change zone, Cancel, then Edit/Save. | Initially locked; Cancel restores field and picker label; Save persists zone and shows toast. |
| CAND-05 | View same-day end and cross-zone next-day end. | Same-day End has only time; overnight End shows Next day and DD-MM-YY end date. |
| CAND-06 | Repeat previous case using older human-readable endpoint response. | Normalized date comparison; no duplicate same-day date under End. |
| CAND-07 | Conditional, if QA pending work is visible: All, pending, verified and every More filters option. | Correct rows; selected filter visible; uncommon active choice indicated in More filters. |
| CAND-08 | Today/Tomorrow/Yesterday at zone midnight, month/year boundary and leap day. | Matches interview start day in candidate zone. |
| CAND-09 | Range with both endpoints; same-day range; missing/reversed endpoints. | Inclusive valid range; styled inline errors for invalid range. |
| CAND-10 | Combine status/date filters and every sortable column. | Intersection of filters; numeric charge and chronological dates/times; toggle direction works. |
| CAND-11 | No bookings versus no matching bookings; click suggested action. | First offers Book Interview; second offers Clear filters resetting date and status. |
| CAND-12 | Future confirmed, past, cancelled and just-expired booking. | Cancel only when eligible; ineligible visible actions are absent or rejected. |

## 6. Candidate quote and booking

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| BOOK-01 | Regular candidate selects valid future slot/type and requests quote. | Availability, duration, price, zone and payment details match settings. |
| BOOK-02 | Missing fields, malformed date/time, past time, start equals end, end before start. | Inline/client or server rejection; no booking/payment/work records written. |
| BOOK-04 | Change date/start/end/type/timezone after quote. | Old quote cannot be used; new quote required where inputs affect booking. |
| BOOK-07 | Regular booking with valid unique reference and positive paid amount. | One confirmed interview and linked SUBMITTED payment; correct amounts, UTC endpoints and candidate snapshot. |
| BOOK-08 | Missing reference; zero/negative/NaN/Infinity amount; duplicate reference with case/whitespace differences. | Server rejects invalid payment input without partial records. |
| BOOK-10 | Percentage candidate books available slot. | Percentage snapshot preserved; NOT_REQUIRED payment; no regular-payment requirement. |
| BOOK-11 | Double-click submit, retry same reference, then reload dashboard. | UI guards repeated clicks; server conflicts/reference checks prevent duplicate accepted booking. |
| BOOK-13 | Book a same-day New York interval which crosses midnight in Kolkata. | Valid booking; admin sees correct next-day label and candidate sees correct own-zone interval. |
| BOOK-14 | Quote with missing placeholder UPI; HTTPS image URL; Drive file link; Drive folder/non-HTTPS QR link. | Settings-driven payment display; placeholder hidden; valid images normalized; unsafe/folder URLs rejected or not displayed per helper. |

## 7. Timezone, dates and hour preference

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| TIME-01 | Toggle 12/24 hours on welcome, candidate and every admin time view/input. | Header switch present; labels/pickers update; underlying HH:mm/UTC and drafts unchanged. |
| TIME-02 | Display 00:00, 12:00, 13:05 and 23:59. | Correct midnight/noon/AM-PM and 24-hour output, with minutes retained. |
| TIME-03 | Set different preference for candidate A, candidate B and admin; reload/log back in. | Browser preference separate per account and persists locally, not globally on server. |
| TIME-07 | Change candidate zone, general business zone and availability zone separately. | Candidate display follows profile; admin table/export follows general zone; availability/Create Booking follows schedule zone. |
| TIME-08 | Year/month/leap boundaries; sort dates 31-12-26 and 01-01-27. | DD-MM-YY display and chronological ordering, not alphabetical ordering. |
| TIME-09 | Toggle format when dynamic rows/quote summaries appear. | Observer updates only marked times; names, references and arbitrary numbers untouched. |

## 8. Admin dashboard, tables, filters and drafts

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| ADMIN-01 | Sign in and refresh with current backend. | Counts/settings/availability load; table pages default to 50; no M_ID popup or stuck loader. |
| ADMIN-02 | Conditional, if QA pending work is visible: Click candidate/upcoming/pending-payment/refund metric cards. | Relevant page and matching filter; unrelated restrictions cleared; counts are global. |
| ADMIN-03 | Conditional, if QA pending work is visible: To do with pending payments/refunds/work, all zero, and unsupported work projection. | Correct actionable counts; supported empty work is green; unsupported work is unavailable, not false zero. |
| ADMIN-04 | All five tables: every sortable header, direction toggle and equal sort values. | Numeric/date/text ordering; stable usable paging; arrows and aria-sort match. |
| ADMIN-05 | Conditional on sufficient saved rows: Search mixed case, multiple terms, ID/name/email/reference and match beyond page one. | Search covers all records and relevant joined fields before paging. |
| ADMIN-07 | Payment/refund date filter with submission date different from interview start date. | Matches associated interview start in general business zone, not submission/refund timestamp. |
| ADMIN-08 | Missing/reversed range; valid inclusive endpoints; Reset/All dates. | Error below date fields; valid results and correct cleared state. |
| ADMIN-09 | Conditional on sufficient saved rows: 0, 1, 50, 51, 100 and 101 rows; Previous/Next; remove/filter last-page row. | Correct controls/counts; no lost or duplicated records; stale page recovers safely. |
| ADMIN-11 | Start candidate/booking/payment edit, then sort/filter/page away and back. | Draft restored when row visible; saved value unchanged until Save. |
| ADMIN-12 | Save/Cancel editor, navigate away/back, then refresh. | Cancel removes draft; successful save/refresh clears stale drafts. |
| ADMIN-13 | Candidates with long emails/phones; Bookings with all statuses/actions. | Candidates fits card; only Bookings has dedicated keyboard-scrollable 1840px table; readable aligned cells. |
| ADMIN-15 | Authentication/network/data error during paged read. | visible retry/login error and recovered loading state. |
| ADMIN-16 | Slow two searches/tab changes, responses arriving out of order. | Latest selected view/query wins; no stale rows replacing current page. Record any race as failure. |

## 9. Admin candidates

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| CONTACT-01 | Create regular and percentage candidates with valid contact/zone. | Correct account fields and unique ID; safe returned projection. |
| CONTACT-02 | Edit available QA email/phone/type/percentage fields; Save and reload. | Visible changes persist; inputs initially locked. Zone/active mutations are Blocked if no UI control exists. |
| CONTACT-03 | Edit several fields and Cancel. | All original values and picker labels restored; no RPC mutation. |
| CONTACT-07 | Conditional if visible deactivation control exists: deactivate QA candidate; check Create Booking choices and normal candidate login. | Inactive QA excluded/rejected; existing records retained. No direct API calls. |

## 10. Admin Create Booking and booking corrections

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| CREATE-01 | General zone Kolkata, schedule zone New York; open Create Booking. | Read-only form zone is New York; candidate choices contain active candidates only. |
| CREATE-02 | Enter New York winter 12:00–12:30. | Client maps to general-zone payload 22:30–23:00 with identical UTC instants; form stays New York. |
| CREATE-03 | Source-to-target conversion advances date or crosses target midnight. | Correct converted date/overnight flag; no shifted actual interval. |
| CREATE-04 | Admin 23:00–01:00 without/with overnight confirmation. | Unconfirmed reversed interval rejected; confirmed future interval uses following local date. |
| CREATE-06 | Conditional with two admin browser sessions: open Create Booking; in other session change general zone via Settings; submit original QA form. Restore original zone. | Stale form rejected if it still uses previous zone; refresh permits correct new form. |
| CREATE-07 | Outside hours/blocked/conflicting slot with override off/on. | Off rejects; intentional admin override behaves as expected; candidate has no override control. |
| CREATE-09 | Leave final charge blank; specify zero/valid correction; use percentage candidate. | Blank uses calculated price; valid explicit charge respected; percentage payment stays NOT_REQUIRED. |
| CORRECT-01 | Edit QA confirmed booking charge/paid/reference/remark; Save; revisit linked payment and visible pending refund. | Visible amounts/reference synchronize. Internal audit record not checked. |
| CORRECT-03 | Cancel edit; edit cancelled booking; duplicate reference; change completed-refund amount. | Cancel restores values; cancelled row read-only; forbidden writes rejected with records unchanged. |

## 11. Payments, cancellation and refunds

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| MONEY-01 | Verify QA SUBMITTED payment; mark separate QA payment FAILED; compare booking/payment views. | Visible statuses agree; refreshed rows retain change. |
| MONEY-02 | Open Change on VERIFIED and FAILED payment. | Current saved status selected; styled Save/Cancel; no reason field or Update payment status label. |
| MONEY-03 | Open Change, alter selection, Cancel; filter/page/rerender. | Editor stays closed; saved status unchanged; discarded draft never reopens. |
| MONEY-04 | Change VERIFIED/FAILED QA payment to each permitted status; refresh both roles. | New state agrees across payment/booking/candidate views; hidden audit details not claimed verified. |
| CANCEL-01 | Candidate cancels own future interview; dismiss in-page confirmation first. | Dismiss makes no write; confirm cancels booking, updates UI and queues external cleanup as needed. |
| CANCEL-04 | Cancel with verified/submitted/no-payment states. | Refund request follows paid/status policy; no-payment case does not create an owed-money refund. |
| REFUND-01 | Complete QA requested refund for cancelled VERIFIED booking with valid reference; refresh both roles. | Refund and booking show Refunded consistently; reference retained where displayed. |
| REFUND-04 | Fail save/network response in payment/refund editor. | Clear error, controls usable, no claimed success; reread saved state before retry. |

## 12. Availability, buffers and pricing

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| AV-01 | Open Availability; click Edit beside Add Rule; Cancel. | Rules/zone initially locked; Edit unlocks; Save/Cancel appears; Cancel restores and relocks. |
| AV-02 | Save weekly hours with separate availability zone; reload. | Rule hours follow saved AVAILABILITY_TIMEZONE; saved zone and rules agree. |
| AV-03 | Change general Settings zone after availability save. | Availability zone/hours unchanged; Create Booking still follows schedule zone. |
| AV-04 | Deliberately edit availability zone and Save. | Entered clock hours apply to new schedule zone; no automatic general-zone conversion. |
| AV-06 | Add/remove WEEKLY and BLOCK rows; switch rule type. | Correct weekday/date fields shown; irrelevant field disabled; saved rule behavior matches type. |
| AV-08 | Full-day dated block and partial block, including cross-midnight weekly window. | Relevant actual intervals unavailable; supported overnight windows interpreted in schedule zone. |
| AV-14 | Reopen Availability after save and refresh; inspect for outdated-server message. | Current preview supports saved independent zone. If update-server error appears, report failure instead of substituting mock backend. |

## 13. Settings and visible pending updates

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| SET-01 | Settings Edit, change allowed fields, Cancel then Save. | Locked default; Cancel restores; Save persists visible values with toast. |
| WORK-03 | Conditional, if QA pending work is visible: Retry one failed job; retry oldest batch with more than ten jobs. | Admin-only retry; batch at most ten; successes clear, failures remain with updated attempts. |
| WORK-04 | Conditional, if QA pending work is visible: More than twenty pending jobs; malformed work entry/missing booking. | Full count, bounded list; invalid job shown safely without unsafe retry control. |
| WORK-07 | Error details contain HTML-looking text or URL query strings. | Escaped display; sensitive URL query strings removed in dialog stack details; no script execution. |

## 14. Excel export

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| XLSX-01 | Export Dashboard, Bookings, Candidates, Payments and Refunds. | Genuine .xlsx downloads with relevant mapped columns; no server/Drive/Sheet creation. |
| XLSX-02 | Conditional on sufficient saved rows: Combine query/status/date/upcoming/sort and export more than 100 matches. | All matching pages in selected order, not just current 50 rows; exact count/IDs agree. |
| XLSX-03 | Export with no matches and with one match. | Valid workbook with headers and zero/one data rows; no corrupt package. |
| XLSX-04 | Candidate/general/schedule zones differ; switch 12/24 before export. | Booking-related dates/times follow general business zone and selected format; both endpoint dates/zone included. |
| XLSX-10 | Click repeatedly, fail a page read, expire session mid-export. | No overlapping downloads; admin permission rechecked; button/loading state recovers; visible error. |

## 15. Popups, pickers, accessibility and visual checks

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| UI-01 | Trigger every confirmation/error/success in both roles; monitor native dialogs. | Portal uses in-page dialog/inline error/toast; no application alert/prompt/confirm. Chrome's own password manager is outside application control. |
| UI-02 | Dismiss dialogs via Cancel/close/Escape where supported; open another. | Focus restored; no trapped overlay or leftover disabled controls. |
| UI-03 | Save profile/settings/rules/candidate; close toast or wait four seconds. | Accessible green non-blocking Changes saved feedback; hides correctly. |
| UI-04 | Date picker month/year navigation, Today/Clear, leap day. | Valid calendar cells; underlying date and input/change events updated. |
| UI-05 | Time picker 12/24 modes, AM/PM, minutes, Apply. | Correct HH:mm value; quote invalidation works; disabled fields cannot be changed. |
| UI-06 | Interview type/timezone picker; case-insensitive zone search; no results. | Styled readable options; correct selected underlying value; no index mismatch. |
| UI-07 | Open picker near viewport edge, scroll/resize/click outside, Tab/Escape. | Panel stays usable and closes appropriately; keyboard/focus behavior works. |
| UI-09 | Keyboard-only navigation through tabs, sort headers, filters, forms and Bookings scroll region. | Visible focus and usable controls; aria-current/pressed/sort/status labels reflect state. |
| UI-10 | Long names/email/phone/reference, huge numbers, empty pages and busy payment editor. | No overlapping badges/buttons, unreadable clipping or unintended internal scroll regions. |
| UI-12 | Repeat Refresh and timezone Edit/Cancel/Save with console/error monitoring. | No M_ID error, uncaught rejection, duplicate event handler or stuck loading. Natural recurrence must be recorded with its stack. |

## 17. Complete local journeys

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| FLOW-01 | Register regular QA candidate → login → choose valid slot → quote → submit unique payment reference → reload. | Candidate sees one confirmed pending-payment booking; admin sees linked candidate/interview/payment with matching amounts/UTC. |
| FLOW-02 | Admin verifies that payment → candidate refreshes → candidate cancels → admin completes refund. | Both dashboards agree through each transition; one refund only; completed refund protected. |
| FLOW-03 | Register QA candidate through website; admin changes its type to PERCENTAGE; candidate books normally; admin reviews. | No regular payment required; correct visible percentage/no-payment behaviour. |
| FLOW-04 | Save schedule zone/hours → change general zone → Create Booking → inspect admin/candidate views. | Schedule remains independent; one actual UTC interval, correct local times/next-day labels everywhere. |
| FLOW-05 | Search/filter/sort admin data across pages → export → compare workbook to matching saved records. | Workbook count/order/content match all results; no unsaved drafts or private fields. |
| FLOW-06 | QA candidate: login, refresh, password change/recovery, new login and logout. Admin form checks without unauthorized credential mutation. | Session restoration and inline success work; old password rejected; protected action after logout unavailable. |

## Additional explicit manual checks

| ID | What to do on the website | What should happen |
| --- | --- | --- |
| MANUAL-01 | Register QA candidate ? login by email ? logout ? login by ID. Try wrong password once, then correct password. | Same account opens by either identifier; error visible, correct login usable. |
| MANUAL-02 | On dedicated QA candidate only: five wrong passwords, correct password during lock, then retry after 15 minutes. | Account lock and timed recovery visible. Do not lock shared admin. |
| MANUAL-03 | QA candidate: Forgot password, request local code, try wrong code and password mismatch, then complete valid reset. | Inline errors; old password fails and new password works; used code rejected. |
| MANUAL-04 | QA candidate recovery: request resend before/after one minute. Conditional: wait ten minutes to test code expiry; five wrong-code attempts on separate QA request. | Throttle/expiry/attempt limits visible. Record actual waits; incomplete waits are Blocked. |
| MANUAL-05 | Admin: open Forgot password and test form/Back. Test successful reset/change only with explicit shared-password permission. | No stuck editor or Chrome application popup. Unauthorized credential mutation variant remains Blocked. |
| MANUAL-06 | QA candidate: Change Password with wrong current password, mismatched new password and valid new password. | Errors inline; successful change returns to login with success; old login rejected. |
| MANUAL-07 | Register two QA candidates; sign in separately and compare their dashboard rows. | Each sees own interviews only. This visible check does not prove every direct API security rule. |
| MANUAL-08 | Admin Candidates: Edit QA email/phone/type/percentage; Cancel first, then Save valid values and refresh. Try duplicate/invalid/admin email, bad phone and -1/101 percent. | Cancel restores; valid save persists; invalid edit does not partly save. Check each field separately. |
| MANUAL-09 | Admin Create Booking: inspect actual candidate/form controls; choose QA candidate and future free slot; try blank/negative charge and intentional override. | Available controls behave correctly; do not assume backend-only controls exist on the page. |
| MANUAL-10 | Export after filters/sort; open downloaded file in available spreadsheet viewer; compare all rows, numeric money, text references, headers and timezones. | Workbook matches saved data. Without a viewer, download check may pass but content/format checks are Blocked. |
| MANUAL-11 | Change Settings/Availability for timezone/pricing/buffer cases, then restore captured original rules/values through UI and refresh. | Original shared configuration restored exactly; any unresolved change prominently reported. |
| MANUAL-12 | Conditional: visible QA pending-work job ? expand error details ? Try again; inspect state after refresh. | UI feedback and recovery observed. If no job exists, Blocked; do not inject a fake failure. |
| MANUAL-13 | Rapidly type searches and switch admin tabs; return, refresh and change timezone. | Latest view correct; no M_ID popup, stale rows or stuck loader. |
| MANUAL-14 | For QA records: Cancel booking edit, Cancel payment Change, dismiss refund reference prompt; navigate away/back. | No saved changes, no abandoned editor reopening, all controls usable. |

## Limits of this manual website run

This walkthrough checks visible features and saved behaviour across pages. It cannot prove internal hashing/private properties, audit internals, owner setup/reset, schema migration, malicious direct API calls or server lock atomicity. Those require separate technical tests; do not claim them passed after UI clicks.

Live Google email/Calendar/Contacts, deployed scopes/quotas/performance and real distributed concurrency are for after deployment. Conditional missing-data cases stay Blocked. Date/time cells in Excel are currently text, not native spreadsheet dates; export is not a transactional snapshot. Fixed desktop mode deliberately allows page scrolling on narrow windows. These limitations belong in the report.

## Required final report after execution

Create **WEBSITE_TEST_REPORT.md** after an actual browser run, then tell the user the main findings in simple words. Do not create a pretend completed report when only updating this checklist.

Include:

1. Date/time, URL, browser/window size, confirmation local not deployed, and QA account/record IDs (no credentials/codes).
2. Total cases and Pass/Fail/Blocked/Not run counts adding up. For partially tested rows list sub-results and do not mark full Pass.
3. Every case ID, actual observation, exact inputs, evidence and any bug link. A fixture-rendered page or successful form-open is not proof its mutation works.
4. Every bug: High/Medium/Low, affected page, exact repeatable steps, expected versus actual result, affected QA IDs and screenshot. High = wrong money/time, lost data, account access issue or unusable main feature; Medium = broken action/filter; Low = appearance/usability.
5. Completed candidate/admin journeys and comparison of their saved states.
6. Shared settings/rules changed and restoration status, remaining QA records, and any cleanup not performed. Never silently delete other records.
7. Blocked cases and reasons: unavailable browser/viewer, missing data, credential permission, elapsed waits not completed or condition not present.
8. Conclusion: ready for local use or needs fixes, most important fixes, and what remains untested. No blanket everything passed statement if important cases were blocked.

Result table:

| Case ID | Status | Actual result and exact inputs | Evidence / bug |
| --- | --- | --- | --- |
| Example | Not run | Fill during actual website run | |

## Instruction to give the next agent

> Read ../AGENTS.md, ../PROJECT_GUIDE.md and LOCAL_TEST_CASES.md. Open http://127.0.0.1:8787/ in a browser and perform every accessible case using real clicks/forms. Do not substitute Node tests, direct API calls or injected sample screens. Use QA records and restore changed shared Settings/Availability. Leave shared admin credential mutations blocked unless separately authorized. Do not deploy or restart/reset the server. Write WEBSITE_TEST_REPORT.md with every result and bug, then give me a simple summary of what passed, failed and could not be checked.

## Plan history

- 10-10-2026: Replaced mixed Node/mock/API plan with browser-only website walkthrough (135 cases), visible action requirements, conditional checks, restoration rules and required final report. No website tests executed during this documentation task.
