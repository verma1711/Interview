# Local test cases — Interview Booking Portal

Version: 2026-10-10. Scope: the current code and local preview, before Apps Script deployment.

This is a test plan, not a report saying every test passed. Every case starts as **Not run**. Existing automated tests cover parts of this plan; their presence does not prove an entire row or browser journey passed. Record actual results using the template below.

## How to use this file

1. Read `AGENTS.md` and `PROJECT_GUIDE.md`, then the source for the feature being tested.
2. Use the running preview at `http://127.0.0.1:8787/`. Confirm the LOCAL TEST DATA ONLY banner. Do not start another server just to follow this checklist.
3. Use clearly named test records, such as `QA Local Regular`, and unique payment references, such as `QA-20261010-001`. Get approval before restarting an existing preview: restart erases its temporary records and sessions.
4. Browser checks use the real local forms and local RPCs. Server failure injection, time changes, owner checks, private storage inspection, and malformed requests belong in a separate Node mock test process using `local-preview/mock-store.cjs`. Do not patch the running shared preview or change its administrator password for these tests.
5. For each case, note the inputs, steps, expected result, actual result and evidence. Check related records after writes, not only the success message. A fixture-rendered screen is a UI check, not an end-to-end booking test.
6. Run the critical cases first, then the remaining sections. Recheck affected cases after a fix. Update this plan when features change, alongside `PROJECT_GUIDE.md`.

**Test methods:** B = browser with local server; M = isolated server/helper mocks; H = local HTTP check; X = downloaded Excel inspection. Use both methods where listed.

**Priority:** all access-control, credential, booking, money, refund, timezone and data-preservation cases are critical. Visual polish and compatibility checks follow them. A critical failure blocks local sign-off.

```text
Run date / tester / code version:
Case ID / method:
Setup and exact inputs:
Steps performed:
Expected result:
Actual result:
Status: Not run | Pass | Fail | Blocked
Evidence: test output, screenshot, response, or workbook
Bug / follow-up:
Cleanup performed:
```

## Test accounts and sample data

Seed accounts are listed in `local-preview/README.md`. Use emails because generated candidate IDs change on restart. Never copy real credentials into this file or evidence.

Prepare these records in an isolated mock, or create clearly named disposable records through authorized local forms:

- One regular candidate, one percentage candidate, one inactive candidate, and a new candidate with no bookings.
- Future confirmed interviews with SUBMITTED, VERIFIED, FAILED and NOT_REQUIRED payments; cancelled interviews with requested and completed refunds; a past interview.
- More than 100 records for paging/export checks, with a match beyond the first page. Include identical sort values, numeric values 2/10/100, zero amounts, and long names/email addresses.
- Weekly availability 12:00–20:00 in America/New_York, dated partial/full-day blocks, one disabled rule, and a rule with a saved note. Unless changed deliberately, before/after buffers are 30 minutes.
- Separate display and schedule zones: general BUSINESS_TIMEZONE = Asia/Kolkata, AVAILABILITY_TIMEZONE = America/New_York. Candidate zones: New York, Kolkata, UTC, and Pacific/Chatham.
- Future dates selected relative to test time for successful bookings. For historic DST examples, freeze time in an isolated mock before the example; do not expect a past date to book in today's browser.
- DST examples: New York 08-03-2026 at 02:30 (missing time), 01-11-2026 at 01:30 (repeated time); normal summer/winter dates. Leap date: 29-02-2028. Year boundary: 31-12-2026 to 01-01-2027.
- Text containing `<script>`, quotes, `&`, Unicode names, leading zeroes, and `=1+1`. Use inert text; verify escaping/literal storage rather than executing injected code.

No real bank transfer, Google email, Calendar event, or Contact is required. Mail/Calendar/Contacts assertions below refer only to mocks.

## 1. Preview and shared navigation

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| ENV-01 | B/H | Open 8787 and reload after an HTML edit in a disposable copy. | Complete styled UI, local banner and current HTML; no missing styles/scripts. |
| ENV-02 | M | Start a disposable mock, change data, then create a fresh mock process. | Data is temporary; fresh process has seed data, not previous edits. |
| ENV-03 | H | GET an unknown path; send unsupported RPC name, non-array args, malformed JSON, and body over 100,000 characters. | Requests fail cleanly; private/owner helpers cannot be invoked through the RPC allowlist. Server remains usable. |
| ENV-04 | H | POST /rpc with a foreign Origin header. | HTTP 403; no mutation. Same-origin valid calls work. |
| ENV-05 | B/M | Inject a failing Google bridge while using marked loopback preview. | Local fetch RPC still works; production-mode mock uses google.script.run instead. |
| ENV-06 | B/M | Fail a request, including synchronous missing method and invalid JSON response. | Loading overlay/buttons recover; visible error; next valid action works. |
| NAV-01 | B | Visit every candidate and admin tab; return to Dashboard. | Correct content and active tab; no duplicate panels or uncaught errors. |
| NAV-02 | B | Hover, focus and press tabs, metric cards, Refresh and Logout. | Visible feedback; Logout uses its exit-arrow effect; actions remain clickable. |
| NAV-03 | B | Enable reduced motion and repeat navigation/toast/refresh. | Functionality remains; motion is reduced or disabled. |
| NAV-04 | B | Resize below 1365px and use a large desktop window. | Fixed desktop canvas remains; smaller viewport can scroll horizontally. No accidental responsive card conversion. |
| NAV-05 | B | Sign out, reload, and use Back. | Protected operations require a valid session; no usable stale signed-in page. |

## 2. Registration, login and sessions

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| AUTH-01 | B/M | Register valid name/email/phone/timezone and matching password. | One candidate with AV-prefixed ID, normalized contact data, hashed credential and correct profile. |
| AUTH-02 | B/M | Blank required fields; invalid email; invalid/incomplete international phone; invalid timezone. | Clear validation; no partial candidate/session created. |
| AUTH-03 | B/M | Repeat registration using email with different case/whitespace; use admin email. | Duplicate/reserved email rejected; no duplicate record. |
| AUTH-04 | B/M | Password mismatch; lengths 7, 8, 1024 and 1025 characters. | UI rejects mismatch; server permits policy boundaries 8–1024 and rejects outside them. |
| AUTH-05 | B/M | Name with Unicode/quotes/HTML-looking text. | Text preserved safely; no HTML execution or broken table. |
| AUTH-06 | B/M | Log in by candidate email and by generated ID. | Both identify the same account; correct role and profile. |
| AUTH-07 | B/M | Wrong password, unknown identifier, candidate credentials on admin login and reverse. | Login fails without revealing password data or granting the wrong role. |
| AUTH-08 | M | Five failed logins; try correct password during lock and after 15 minutes. | Lock enforced; expiry allows correct login. Test both roles. |
| AUTH-09 | M | Successful and failed legacy-credential logins for each role. | Only a successful login migrates to salted credentials without changing password. |
| AUTH-10 | M | Same password for two accounts; inspect credentials/session storage. | Different salts/hashes; session table stores token digest, not raw bearer token. |
| AUTH-11 | B/M | Refresh with valid token, expired six-hour token, revoked token and malformed token. | Valid session restores; others return to login safely. |
| AUTH-12 | B/M | Logout then reuse captured token against a protected read/write. | Token rejected. Repeat logout fails safely or is harmless. |
| AUTH-13 | M | Deactivate candidate or change credential/email, then use old sessions. | Old candidate sessions rejected; unrelated accounts remain valid. |
| AUTH-14 | B/M | Two local tabs; logout in one then make protected request in the other. | Server rejects revoked token even if the other tab still displays cached UI. |
| AUTH-15 | M | Issue sessions during daily expired-row cleanup. | Expired/revoked rows compact; active sessions and custom columns survive. |
| AUTH-16 | B/M | Corrupt stored login state; unavailable localStorage in browser fixture. | No frozen overlay or uncaught initialization failure; safe visible recovery. Record any unsupported storage case as a bug. |

## 3. Candidate and admin password recovery/change

Run credential mutations against isolated accounts/mock processes, not the shared preview administrator.

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| PASS-01 | B/M | Candidate Forgot password with matching identifier/email. | Code sent to mock registered email; local notice shows code; no raw code stored in reset fields. |
| PASS-02 | M | Unknown identifier/email or mismatched registered email. | No reset for another account; response follows privacy-safe behavior; no unintended email. |
| PASS-03 | B/M | Admin Forgot password with configured ADMIN_EMAIL. | Styled in-page email/code/password form; mock delivery only to admin account. |
| PASS-04 | M | Unknown admin email; notification email instead of admin email. | Generic response, no reset message/code issued to unrecognized address. |
| PASS-05 | M | Inspect admin reset property and candidate recovery fields. | HMAC digest/expiry/attempt metadata; no stored plaintext code. |
| PASS-06 | M | Resend before one minute, then after one minute; use replaced code. | Early resend blocked; new request permitted after interval; old code unusable. |
| PASS-07 | M | Wrong code five times, expired code at ten minutes, malformed/empty code. | Reset rejected; exhausted/expired code cannot change password. |
| PASS-08 | B/M | Valid reset, then reuse code and sign in with old/new password. | Code single-use; old password fails; new password works. |
| PASS-09 | M | Reset admin password with active admin and candidate sessions. | All old admin sessions revoked; candidate sessions preserved. |
| PASS-10 | M | Reset candidate password with several candidate sessions. | That candidate's old sessions revoked; other accounts preserved. |
| PASS-11 | B/M | Wrong current password; new-password mismatch; short/long password on Change Password. | Inline validation/error; credentials unchanged. Both roles. |
| PASS-12 | B/M | Successful signed-in password change with pending recovery code. | Pending code invalidated; session cleared; inline success on sign-in screen. |
| PASS-13 | M | Inject reset email delivery failure. | Visible safe failure and pending recovery cleanup; retry can recover. |
| PASS-14 | B | Back/Cancel recovery, navigate away, reopen; dismiss code notice. | Secret fields cleared appropriately; no native alert/prompt/confirm. |

## 4. Visitor and candidate blocked schedules

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| PUBLIC-01 | B/M | Load public schedules for a valid date/zone without signing in. | Confirmed occupied intervals only; no candidate ID/name/email/phone, booking ID, money/reference or secrets. |
| PUBLIC-02 | B/M | Query date with no interviews; invalid date/zone; 31 February. | Friendly empty result or clear validation; impossible dates rejected. |
| PUBLIC-03 | M | Booking crosses local midnight; booking ends exactly at midnight. | Appears on every intersected day; exclusive end does not add a false occupied day. |
| PUBLIC-04 | B/M | Change New York to Kolkata and UTC for the same booking. | Correct local dates/times; UTC interval unchanged. |
| PUBLIC-05 | M | Cancelled record, invalid UTC endpoints, or end before start. | Not exposed as a valid confirmed occupied interval. |
| PUBLIC-06 | B/M | Sort Status/Date/Start/End, toggle directions, refresh. | Chronological ordering, highlighted SVG arrows and aria-sort; sort persists per table. |
| PUBLIC-07 | B | Change welcome sort, then candidate blocked-schedule sort. | Independent sort state; no data mutation or extra RPC solely for sorting. |
| PUBLIC-08 | B/M | View spring/fall DST dates and toggle 12/24 hours. | Correct local offsets and displayed hours; no assumed 24-hour day boundary. |

## 5. Candidate dashboard and profile

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| CAND-01 | B | Open profile/dashboard with long name and all payment/refund states. | Compact ID/account/timezone row; readable badges and aligned Date/Start/End columns; no My Interviews heading. |
| CAND-02 | B/M | Load one candidate's home with another candidate's bookings present. | Only signed-in candidate's profile/interviews; private auth fields absent. |
| CAND-03 | B | Profile initial state, Edit, change zone, Cancel, then Edit/Save. | Initially locked; Cancel restores field and picker label; Save persists zone and shows toast. |
| CAND-04 | B/M | Failed timezone save or invalid zone sent directly. | No false success; saved profile stays unchanged; controls recover. |
| CAND-05 | B/M | View same-day end and cross-zone next-day end. | Same-day End has only time; overnight End shows Next day and DD-MM-YY end date. |
| CAND-06 | B/M | Repeat previous case using older human-readable endpoint response. | Normalized date comparison; no duplicate same-day date under End. |
| CAND-07 | B | All, pending, verified and every More filters option. | Correct rows; selected filter visible; uncommon active choice indicated in More filters. |
| CAND-08 | B/M | Today/Tomorrow/Yesterday at zone midnight, month/year boundary and leap day. | Matches interview start day in candidate zone. |
| CAND-09 | B | Range with both endpoints; same-day range; missing/reversed endpoints. | Inclusive valid range; styled inline errors for invalid range. |
| CAND-10 | B/M | Combine status/date filters and every sortable column. | Intersection of filters; numeric charge and chronological dates/times; toggle direction works. |
| CAND-11 | B | No bookings versus no matching bookings; click suggested action. | First offers Book Interview; second offers Clear filters resetting date and status. |
| CAND-12 | B/M | Future confirmed, past, cancelled and just-expired booking. | Cancel only when eligible; server independently enforces time/ownership checks. |

## 6. Candidate quote and booking

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| BOOK-01 | B/M | Regular candidate selects valid future slot/type and requests quote. | Availability, duration, price, zone and payment details match settings. |
| BOOK-02 | B/M | Missing fields, malformed date/time, past time, start equals end, end before start. | Inline/client or server rejection; no booking/payment/work records written. |
| BOOK-03 | B/M | Candidate 23:00–01:00; direct call with overnightConfirmed=true. | Candidate has no overnight button; quote and submission reject same-day reversed times. |
| BOOK-04 | B/M | Change date/start/end/type/timezone after quote. | Old quote cannot be used; new quote required where inputs affect booking. |
| BOOK-05 | M | Change pricing/account payment requirement between quote and submission. | Stale expected quote rejected; no incorrect charge/payment record. |
| BOOK-06 | M | Another booking takes slot after quote. | Submission rechecks under lock and rejects conflict; no duplicate accepted slot. |
| BOOK-07 | B/M | Regular booking with valid unique reference and positive paid amount. | One confirmed interview and linked SUBMITTED payment; correct amounts, UTC endpoints and candidate snapshot. |
| BOOK-08 | B/M | Missing reference; zero/negative/NaN/Infinity amount; duplicate reference with case/whitespace differences. | Server rejects invalid payment input without partial records. |
| BOOK-09 | M | Submit regular amount below/above charge. | Positive submitted amount remains distinct from calculated/final charge; admin can review. Do not assume automatic bank verification. |
| BOOK-10 | B/M | Percentage candidate books available slot. | Percentage snapshot preserved; NOT_REQUIRED payment; no regular-payment requirement. |
| BOOK-11 | B/M | Double-click submit, retry same reference, then reload dashboard. | UI guards repeated clicks; server conflicts/reference checks prevent duplicate accepted booking. |
| BOOK-12 | M | Submit using forged candidateId/timezone/price/override/payment status. | Session/profile/settings determine identity and charge; candidate cannot gain admin override or verification rights. |
| BOOK-13 | B/M | Book a same-day New York interval which crosses midnight in Kolkata. | Valid booking; admin sees correct next-day label and candidate sees correct own-zone interval. |
| BOOK-14 | B/M | Quote with missing placeholder UPI; HTTPS image URL; Drive file link; Drive folder/non-HTTPS QR link. | Settings-driven payment display; placeholder hidden; valid images normalized; unsafe/folder URLs rejected or not displayed per helper. |
| BOOK-15 | M | Inject Calendar or notification failure after booking save. | Booking retained, pending work/error recorded; no misleading rollback or second booking. |

## 7. Timezone, dates and hour preference

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| TIME-01 | B/M | Toggle 12/24 hours on welcome, candidate and every admin time view/input. | Header switch present; labels/pickers update; underlying HH:mm/UTC and drafts unchanged. |
| TIME-02 | B/M | Display 00:00, 12:00, 13:05 and 23:59. | Correct midnight/noon/AM-PM and 24-hour output, with minutes retained. |
| TIME-03 | B | Set different preference for candidate A, candidate B and admin; reload/log back in. | Browser preference separate per account and persists locally, not globally on server. |
| TIME-04 | M | Convert normal winter/summer New York intervals to Kolkata. | Correct DST-dependent offset. In winter 12:00 New York is 22:30 Kolkata; summer is 21:30. |
| TIME-05 | M | Enter New York missing 02:30 or repeated 01:30 on listed DST dates. | Unsafe local-to-UTC conversion rejected; no silent guessed booking. |
| TIME-06 | M | UTC, Asia/Calcutta alias, non-preset valid zone, Pacific/Chatham. | Valid zones retained; half/quarter-hour offsets correct; unknown zone rejected. |
| TIME-07 | B/M | Change candidate zone, general business zone and availability zone separately. | Candidate display follows profile; admin table/export follows general zone; availability/Create Booking follows schedule zone. |
| TIME-08 | B/M | Year/month/leap boundaries; sort dates 31-12-26 and 01-01-27. | DD-MM-YY display and chronological ordering, not alphabetical ordering. |
| TIME-09 | B/M | Toggle format when dynamic rows/quote summaries appear. | Observer updates only marked times; names, references and arbitrary numbers untouched. |

## 8. Admin dashboard, tables, filters and drafts

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| ADMIN-01 | B/M | Sign in and refresh with current backend. | Counts/settings/availability load; table pages default to 50; no M_ID popup or stuck loader. |
| ADMIN-02 | B/M | Click candidate/upcoming/pending-payment/refund metric cards. | Relevant page and matching filter; unrelated restrictions cleared; counts are global. |
| ADMIN-03 | B/M | To do with pending payments/refunds/work, all zero, and unsupported work projection. | Correct actionable counts; supported empty work is green; unsupported work is unavailable, not false zero. |
| ADMIN-04 | B | All five tables: every sortable header, direction toggle and equal sort values. | Numeric/date/text ordering; stable usable paging; arrows and aria-sort match. |
| ADMIN-05 | B/M | Search mixed case, multiple terms, ID/name/email/reference and match beyond page one. | Search covers all records and relevant joined fields before paging. |
| ADMIN-06 | B/M | Combine search/status/date/upcoming/sort; compare rows with expected fixture set. | All conditions applied together; totals/page bounds correct. |
| ADMIN-07 | B/M | Payment/refund date filter with submission date different from interview start date. | Matches associated interview start in general business zone, not submission/refund timestamp. |
| ADMIN-08 | B | Missing/reversed range; valid inclusive endpoints; Reset/All dates. | Error below date fields; valid results and correct cleared state. |
| ADMIN-09 | B/M | 0, 1, 50, 51, 100 and 101 rows; Previous/Next; remove/filter last-page row. | Correct controls/counts; no lost or duplicated records; stale page recovers safely. |
| ADMIN-10 | M | Invalid kind/sort/page/size/status options; size over 100. | API validates/bounds options safely; never exposes a private dataset. |
| ADMIN-11 | B | Start candidate/booking/payment edit, then sort/filter/page away and back. | Draft restored when row visible; saved value unchanged until Save. |
| ADMIN-12 | B | Save/Cancel editor, navigate away/back, then refresh. | Cancel removes draft; successful save/refresh clears stale drafts. |
| ADMIN-13 | B | Candidates with long emails/phones; Bookings with all statuses/actions. | Candidates fits card; only Bookings has dedicated keyboard-scrollable 1840px table; readable aligned cells. |
| ADMIN-14 | B/M | Missing overview/page/choice APIs on old-backend fixture. | Missing-method-only fallback to protected dashboard; clear unsupported-feature messages. |
| ADMIN-15 | B/M | Authentication/network/data error during paged read. | No unsafe legacy fallback; visible retry/login error and recovered loading state. |
| ADMIN-16 | B/M | Slow two searches/tab changes, responses arriving out of order. | Latest selected view/query wins; no stale rows replacing current page. Record any race as failure. |

## 9. Admin candidates

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| CONTACT-01 | B/M | Create regular and percentage candidates with valid contact/zone. | Correct account fields and unique ID; safe returned projection. |
| CONTACT-02 | B/M | Edit email/phone/type/percentage/zone/active; Save and reload. | Valid changes persisted and audited; inputs initially locked until Edit. |
| CONTACT-03 | B | Edit several fields and Cancel. | All original values and picker labels restored; no RPC mutation. |
| CONTACT-04 | M | Duplicate/reserved/invalid email, bad international phone, unknown type/zone, percentage below 0 or above 100. | Validate before writes; no partial changes. |
| CONTACT-05 | M | Percentage 0/100, whitespace/case email, formatted phone. | Valid boundaries and normalization; same candidate's unchanged email permitted. |
| CONTACT-06 | M | Change email with pending recovery and active sessions. | Recovery cleared, AuthVersion advanced, old sessions rejected; history snapshots/Contacts not silently rewritten. |
| CONTACT-07 | B/M | Deactivate candidate then open Create Booking choices and attempt direct booking/login. | Inactive candidate excluded/rejected; existing records preserved. |
| CONTACT-08 | M | Mock Contacts failure during candidate creation. | Candidate creation remains usable; no real Contacts delivery claim. |

## 10. Admin Create Booking and booking corrections

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| CREATE-01 | B/M | General zone Kolkata, schedule zone New York; open Create Booking. | Read-only form zone is New York; candidate choices contain active candidates only. |
| CREATE-02 | B/M | Enter New York winter 12:00–12:30. | Client maps to general-zone payload 22:30–23:00 with identical UTC instants; form stays New York. |
| CREATE-03 | B/M | Source-to-target conversion advances date or crosses target midnight. | Correct converted date/overnight flag; no shifted actual interval. |
| CREATE-04 | B/M | Admin 23:00–01:00 without/with overnight confirmation. | Unconfirmed reversed interval rejected; confirmed future interval uses following local date. |
| CREATE-05 | M | Unsafe DST conversion in source or target; malformed/equal times. | Reject before creating a guessed interval. |
| CREATE-06 | B/M | Change server general zone after form loads; submit old payload. | Stale business-timezone guard rejects; refresh required. |
| CREATE-07 | B/M | Outside hours/blocked/conflicting slot with override off/on. | Off rejects; intentional admin override follows server policy and is audited; role required. |
| CREATE-08 | M | Negative/non-finite amounts, invalid payment status, duplicate reference, unknown/inactive candidate. | Reject before writes; valid supplied amounts/status create linked payment where applicable. |
| CREATE-09 | B/M | Leave final charge blank; specify zero/valid correction; use percentage candidate. | Blank uses calculated price; valid explicit charge respected; percentage payment stays NOT_REQUIRED. |
| CORRECT-01 | B/M | Edit confirmed booking final charge/paid/reference/remark. | Linked payment expected/submitted amount/reference and pending refund amount synchronized; before/after audit recorded. |
| CORRECT-02 | M | Add payment details to booking missing payment row. | Exactly one linked payment created; no duplicates on subsequent correction. |
| CORRECT-03 | B/M | Cancel edit; edit cancelled booking; duplicate reference; change completed-refund amount. | Cancel restores values; cancelled row read-only; forbidden writes rejected with records unchanged. |

## 11. Payments, cancellation and refunds

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| MONEY-01 | B/M | Verify SUBMITTED payment; mark a second FAILED. | Payment and linked interview statuses agree; verification time set/cleared correctly; audit present. |
| MONEY-02 | B | Open Change on VERIFIED and FAILED payment. | Current saved status selected; styled Save/Cancel; no reason field or Update payment status label. |
| MONEY-03 | B | Open Change, alter selection, Cancel; filter/page/rerender. | Editor stays closed; saved status unchanged; discarded draft never reopens. |
| MONEY-04 | B/M | Change VERIFIED/FAILED to each permitted state. | Automatic previous/new audit reason sent; previous timestamp/remark retained in audit; new state reconciled. |
| MONEY-05 | M | Direct correction without required reason; unsupported status; missing payment. | Server rejects safely; UI removal of reason field does not remove server protection. |
| MONEY-06 | M | Repeat VERIFIED save with unchanged state. | Existing verification timestamp preserved; no inconsistent linked status. |
| CANCEL-01 | B/M | Candidate cancels own future interview; dismiss in-page confirmation first. | Dismiss makes no write; confirm cancels booking, updates UI and queues external cleanup as needed. |
| CANCEL-02 | M | Other candidate's ID, past booking, unknown ID, forged role. | Unauthorized/ineligible cancellation rejected. |
| CANCEL-03 | M | Cancel twice/retry after response loss. | No duplicate refund request or duplicate active cancellation state. |
| CANCEL-04 | B/M | Cancel with verified/submitted/no-payment states. | Refund request follows paid/status policy; no-payment case does not create an owed-money refund. |
| CANCEL-05 | M | Change cancelled booking payment to FAILED, then VERIFIED. | Pending request rejected/booking refund status reconciled on failure; appropriate request restored on verification without duplicate rows. |
| REFUND-01 | B/M | Complete requested refund for cancelled VERIFIED booking with valid reference. | Refund/booking marked REFUNDED, timestamp/reference stored, audit present. |
| REFUND-02 | M | Missing reference, unverified payment, confirmed booking, missing refund/booking. | Reject before completing refund. |
| REFUND-03 | M | Repeat already completed refund; then try unverify payment or change refunded amount. | Completion is harmless on retry; completed refund protections reject inconsistent corrections. |
| REFUND-04 | B/M | Fail save/network response in payment/refund editor. | Clear error, controls usable, no claimed success; reread saved state before retry. |

## 12. Availability, buffers and pricing

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| AV-01 | B | Open Availability; click Edit beside Add Rule; Cancel. | Rules/zone initially locked; Edit unlocks; Save/Cancel appears; Cancel restores and relocks. |
| AV-02 | B/M | Save weekly hours with separate availability zone; reload. | Rule hours follow saved AVAILABILITY_TIMEZONE; saved zone and rules agree. |
| AV-03 | B/M | Change general Settings zone after availability save. | Availability zone/hours unchanged; Create Booking still follows schedule zone. |
| AV-04 | B/M | Deliberately edit availability zone and Save. | Entered clock hours apply to new schedule zone; no automatic general-zone conversion. |
| AV-05 | M | Legacy settings without schedule anchor, then first general-zone change. | Old schedule zone pinned before general display changes; eligibility preserved. |
| AV-06 | B/M | Add/remove WEEKLY and BLOCK rows; switch rule type. | Correct weekday/date fields shown; irrelevant field disabled; saved rule behavior matches type. |
| AV-07 | M | Invalid weekday/date/time/type, reversed/equal weekly hours, invalid zone, stale source zone. | Server validates according to rule policy before replacing saved rules; no partial invalid save. |
| AV-08 | B/M | Full-day dated block and partial block, including cross-midnight weekly window. | Relevant actual intervals unavailable; supported overnight windows interpreted in schedule zone. |
| AV-09 | M | Disabled rules and existing saved notes; save unrelated edits. | Disabled stays disabled; hidden notes preserved; no visible Note column/input. |
| AV-10 | M | Empty rule list, overlapping weekly windows, adjacent windows. | Defined availability policy exercised; no accidental all-day opening. Record actual empty/combined-window behavior against source. |
| AV-11 | M | Exactly at opening/closing, one minute outside, meeting spanning two windows. | Whole interval must meet working-hours policy; boundary/combined-window handling consistent. |
| AV-12 | M | Before/after buffer boundary exactly touching, then one minute inside buffer. | Touching non-overlapping boundaries allowed per interval policy; intrusion rejected. |
| AV-13 | M | Zero buffers; cancelled occupied booking; interval contained by another booking. | No extra padding at zero; cancelled slot released; all actual overlaps rejected. |
| AV-14 | B/M | Old backend without availabilityTimezoneEditable; attempt zone save. | Clear inline update-server message; unsupported zone not silently saved. |
| PRICE-01 | M | Default durations 1/30/31/40/60/61/90/100/120 minutes. | Started-block pricing: 1/30=$50; 31/40/60=$70; 61/90=$120; 100/120=$140. |
| PRICE-02 | M | Change block/threshold/prices; test exact block/remainder boundary. | Settings-driven price, currency rounding and UI/server agreement. |
| PRICE-03 | M | Zero/negative/non-finite duration; zero block; threshold above block; negative/non-finite prices. | Invalid calculation/configuration rejected; no NaN/Infinity booking charge. |

## 13. Settings and external work mocks

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| SET-01 | B/M | Settings Edit, change allowed fields, Cancel then Save. | Locked default; Cancel restores; Save persists allowed values with toast/audit. |
| SET-02 | M | Invalid zone/buffer/pricing/email/QR; unknown setting key or auth key. | Validate supported settings; forbidden keys do not change credentials/configuration. |
| SET-03 | M | Unrelated/custom settings and sheet columns present during save. | Unrelated data preserved. |
| WORK-01 | M | Mock successful Calendar/email work after booking. | Correct UTC endpoints/booking identity sent; no pending failure left. |
| WORK-02 | M | Calendar/email creation/deletion fails. | Saved business records retained; retry job records kind/payload/error/attempt metadata. |
| WORK-03 | B/M | Retry one failed job; retry oldest batch with more than ten jobs. | Admin-only retry; batch at most ten; successes clear, failures remain with updated attempts. |
| WORK-04 | B/M | More than twenty pending jobs; malformed work entry/missing booking. | Full count, bounded list; invalid job shown safely without unsafe retry control. |
| WORK-05 | M | Repeated Calendar retry with existing booking marker; legacy/new event reference; changed Calendar name. | Duplicate event avoided where marker found; qualified calendar reference respected; legacy limitation recorded. |
| WORK-06 | M | Retry failed email; owner-only editor retry as non-owner. | Retry behavior verified in mail mock; duplicate notification possibility documented; owner operation denied to non-owner. |
| WORK-07 | B/M | Error details contain HTML-looking text or URL query strings. | Escaped display; sensitive URL query strings removed in dialog stack details; no script execution. |

## 14. Excel export

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| XLSX-01 | B/X | Export Dashboard, Bookings, Candidates, Payments and Refunds. | Genuine .xlsx downloads with relevant mapped columns; no server/Drive/Sheet creation. |
| XLSX-02 | B/M/X | Combine query/status/date/upcoming/sort and export more than 100 matches. | All matching pages in selected order, not just current 50 rows; exact count/IDs agree. |
| XLSX-03 | B/X | Export with no matches and with one match. | Valid workbook with headers and zero/one data rows; no corrupt package. |
| XLSX-04 | B/M/X | Candidate/general/schedule zones differ; switch 12/24 before export. | Booking-related dates/times follow general business zone and selected format; both endpoint dates/zone included. |
| XLSX-05 | M/X | Money/percentages 0/2/10/100; phone +001…, IDs/reference leading zeroes and =1+1. | Money/percentages numeric; identifiers literal text; no executable Excel formula. |
| XLSX-06 | M/X | Unicode, XML characters, control characters and long fields. | Safe valid XML/text, no dropped rows; fitted widths bounded. |
| XLSX-07 | M/X | Inspect projections/workbook for salt/hash/token/reset fields. | No authentication secrets exported, including when source fixture contains them. |
| XLSX-08 | M | Exactly 10,000 matches, then 10,001. | Supported bound accepted; larger export stopped with request to narrow filters. |
| XLSX-09 | M | Total/timezone changes, duplicate IDs or missing rows during pages. | Export aborted safely instead of knowingly downloading incomplete data. Stable-total value edits remain a documented snapshot limitation. |
| XLSX-10 | B/M | Click repeatedly, fail a page read, expire session mid-export. | No overlapping downloads; admin permission rechecked; button/loading state recovers; visible error. |
| XLSX-11 | B/M/X | Export with unsaved editor drafts and legacy cached backend. | Saved records exported; legacy filters/search/sort honored, not unsaved text. |
| XLSX-12 | X | Open ZIP/XML parts and, if installed, open workbook in native Excel. | Valid package, styled header, freeze first row and filters; record native Excel separately, never infer from XML check. |
| XLSX-13 | X | Try date arithmetic in exported date/time cells. | Current cells are display text, not serial Excel dates. Record this as known limitation, not implemented arithmetic support. |

## 15. Popups, pickers, accessibility and visual checks

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| UI-01 | B | Trigger every confirmation/error/success in both roles; monitor native dialogs. | Portal uses in-page dialog/inline error/toast; no application alert/prompt/confirm. Chrome's own password manager is outside application control. |
| UI-02 | B | Dismiss dialogs via Cancel/close/Escape where supported; open another. | Focus restored; no trapped overlay or leftover disabled controls. |
| UI-03 | B | Save profile/settings/rules/candidate; close toast or wait four seconds. | Accessible green non-blocking Changes saved feedback; hides correctly. |
| UI-04 | B | Date picker month/year navigation, Today/Clear, leap day. | Valid calendar cells; underlying date and input/change events updated. |
| UI-05 | B | Time picker 12/24 modes, AM/PM, minutes, Apply. | Correct HH:mm value; quote invalidation works; disabled fields cannot be changed. |
| UI-06 | B | Interview type/timezone picker; case-insensitive zone search; no results. | Styled readable options; correct selected underlying value; no index mismatch. |
| UI-07 | B | Open picker near viewport edge, scroll/resize/click outside, Tab/Escape. | Panel stays usable and closes appropriately; keyboard/focus behavior works. |
| UI-08 | B/M | Render dynamic editor and toggle disabled state; fixture without MutationObserver. | Enhanced controls synchronize; native fallback remains usable. |
| UI-09 | B | Keyboard-only navigation through tabs, sort headers, filters, forms and Bookings scroll region. | Visible focus and usable controls; aria-current/pressed/sort/status labels reflect state. |
| UI-10 | B | Long names/email/phone/reference, huge numbers, empty pages and busy payment editor. | No overlapping badges/buttons, unreadable clipping or unintended internal scroll regions. |
| UI-11 | B/M | Inject extension-only rejection and portal-origin error with stack. | Extension error stays console-only; portal error remains visible with safe expandable details. |
| UI-12 | B | Repeat Refresh and timezone Edit/Cancel/Save with console/error monitoring. | No M_ID error, uncaught rejection, duplicate event handler or stuck loading. Natural recurrence must be recorded with its stack. |

## 16. Authorization, data integrity and maintenance

| ID | Method | Steps / input | Expected result |
| --- | --- | --- | --- |
| SAFE-01 | M | Call every protected API with absent/expired/fake token and wrong role. | Access denied before mutation; no private data returned. Include overview/page/choices, candidate home/zone/quote/submit/cancel, all admin writes and retry APIs. |
| SAFE-02 | M | Candidate tries admin payment/refund/settings/availability/export data reads directly. | Server denies; hiding buttons is not the only protection. |
| SAFE-03 | M | Candidate tries another account's booking/cancellation/password action. | Ownership enforced; other account unchanged. |
| SAFE-04 | M | Compare candidate/public/admin response fields against source schema. | Auth hashes/salts/reset metadata/session tokens absent from projections. |
| SAFE-05 | M | Leading = text stored in name/reference/remark and unrelated formulas/custom cells nearby. | Literal input stored safely; targeted writes preserve unrelated formulas/cells. |
| SAFE-06 | M | Invalid mutation with multiple otherwise-valid fields. | No partial validation writes; before/after records identical when rejection is before commit. |
| SAFE-07 | M | Lock contention/failure injection and two competing slot submissions. | Lock released on success/failure; only eligible booking accepted. Mock checks do not prove real distributed Apps Script concurrency. |
| SAFE-08 | M | Generate many candidate/booking/payment/refund/rule IDs, including forced collision fixture. | Correct prefixes; no overwritten records; supported collision checks exercised. |
| SAFE-09 | M | Review successful/rejected sensitive-operation audits. | Correct actor/action/entity and prior/new state for audited writes; no plaintext credentials/reset codes in log. |
| OWNER-01 | M | Setup/auth upgrade/import/reset as non-owner. | Owner check blocks operation before destructive changes. |
| OWNER-02 | M | Setup/upgrade on existing schema with missing auth columns and custom columns. | Missing schema added; existing records/settings/custom columns preserved; repeat is safe. |
| OWNER-03 | M | Legacy import valid/invalid rows, timezone data, then repeat import. | Valid compatible records imported; source tracking prevents duplicates; unsupported rows handled safely. |
| OWNER-04 | M | Destructive reset in an isolated fixture only, then setup again. | Eight portal tabs/auth/recovery/work properties cleared as documented; unrelated tabs/properties retained; setup succeeds. External mock objects are not falsely claimed deleted. |
| OWNER-05 | M | Session cleanup/owner reset with ADMIN_PASSWORD_RESET present. | Correct recovery/session cleanup; no dangling portal reset state. |

## 17. Complete local journeys

These use real local forms/RPCs, not only injected renderer fixtures. Use dedicated disposable accounts; credential journey uses an isolated preview or mock to avoid changing the shared admin password.

| ID | Method | Steps | Expected result |
| --- | --- | --- | --- |
| FLOW-01 | B | Register regular QA candidate → login → choose valid slot → quote → submit unique payment reference → reload. | Candidate sees one confirmed pending-payment booking; admin sees linked candidate/interview/payment with matching amounts/UTC. |
| FLOW-02 | B | Admin verifies that payment → candidate refreshes → candidate cancels → admin completes refund. | Both dashboards agree through each transition; one refund only; completed refund protected. |
| FLOW-03 | B | Admin creates percentage candidate → candidate login/book → admin review. | No regular payment requirement; percentage snapshot and NOT_REQUIRED status consistent. |
| FLOW-04 | B | Save schedule zone/hours → change general zone → Create Booking → inspect admin/candidate views. | Schedule remains independent; one actual UTC interval, correct local times/next-day labels everywhere. |
| FLOW-05 | B/X | Search/filter/sort admin data across pages → export → compare workbook to matching saved records. | Workbook count/order/content match all results; no unsaved drafts or private fields. |
| FLOW-06 | B/M | Login → refresh → password change/recovery → old-token request → new login → logout. | Correct session restoration/revocation and inline feedback for both roles. |
| FLOW-07 | M | Book while mock Calendar/mail fails → verify saved record/work → retry → inspect jobs/records. | Booking survives once; queue recovers; failure and success states agree. |

## Existing automated tests and running them

These scripts are independent local mock/helper tests. They are not the complete manual checklist above. Use them as evidence only for the assertions they actually execute.

| Script in `tests/` | Related sections |
| --- | --- |
| auth.test.cjs | Registration/login/sessions, password change, access, mocked integrations |
| admin-recovery.test.cjs | Admin reset privacy/throttle/expiry/attempts/failure/revocation |
| candidate-edit.test.cjs | Candidate contact validation/privacy/session changes/audit |
| public-bookings.test.cjs | Public projection/date intersection/DST/privacy |
| availability.test.cjs | Rule normalization/blocks/time conversion/overnight windows |
| availability-timezone.test.cjs | Independent schedule zone, stale save guard, Create Booking conversion/DST helpers |
| booking-integrity.test.cjs | Validation/locking/payment inputs/refunds/external work |
| admin-improvements.test.cjs | Credential migration/payment corrections/retry/paged data/session compaction |
| admin-search.test.cjs | Rendered search/filter/sort/edit/navigation/date behavior |
| admin-compatibility.test.cjs | Missing-API fallback and error/loading cleanup |
| local-rpc.test.cjs | Local transport and production routing |
| pickers.test.cjs | Calendar/time/timezone picker helpers/events/hour preference |
| admin-export.test.cjs | XLSX package/safe text/numbers/all pages/privacy/export limit |
| reset.test.cjs | Owner reset cleanup/preservation/setup |

Run from the project root:

```powershell
Get-ChildItem tests/*.test.cjs | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Test failed: $($_.Name)" }
}
```

The tests run their own mock contexts and do not reset the running preview. Some write local test artifacts, including a sample workbook. Check individual scripts before extending them. For a focused run: `node tests/admin-export.test.cjs`.

## Local completion rules and excluded checks

Local sign-off needs all critical rows and complete local journeys to pass, plus recorded results for the remaining rows. A skipped or blocked check must stay visible with its reason. No blanket “everything tested” based only on fourteen passing scripts.

Known current limits: Excel date/time cells are text; export is not a transactional snapshot; fixed desktop layout deliberately scrolls on narrow screens; mocks do not prove real multi-user concurrency or Google service behavior. Old conversion-preview helpers remain tested but are not the current Availability screen.

**Do after deployment in a separate plan:** Google authorization/scopes, real Sheets persistence, actual Mail/Calendar/Contacts delivery and permissions, shared Calendar behavior, quotas, Apps Script execution limits/latency, real concurrent requests/locks, deployment version/cache, real owner identity and production recovery privacy. Do not deploy or send live messages as part of this plan. Real bank/payment settlement is not implemented by this portal and cannot be proved by changing a status in the UI.

## Plan maintenance history

- 2026-10-10: Created local-only module, edge-case, regression and full-journey checklist from the maintained guide, current source APIs and existing test scripts. Cases start Not run; creating this plan does not execute them. Live Google checks reserved for a separate post-deployment plan.
