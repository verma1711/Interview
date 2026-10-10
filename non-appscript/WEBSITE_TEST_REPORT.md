# Local website walkthrough report

Run date: 2026-10-11 (local session time, UTC+05:30)  
Target: `http://127.0.0.1:8787/`  
Environment: Existing local preview, in-memory Apps Script/Google-service mocks; **not deployed** and no live Sheet, Calendar, email, Contacts, or bank transfer used.  
Browser: Integrated browser shared for this session. Exact viewport dimensions were not exposed by browser controls.  
Server handling: Used the already-running preview; did not start a second server, restart it, or reset data. The current page was left at the public welcome screen after logout.  
QA records: Candidates `AV-9GM8I` and `AV-IKFEJ`; booking `INT-QCSYC4`; payment `PAY-7GN21W`; refund `REF-IRHMTU`. Test payment/refund references were QA-only mock strings. No credentials or recovery codes are included here.

## Summary

| Result | Count |
| --- | ---: |
| Pass | 11 |
| Fail | 2 |
| Blocked (conditional or only partially exercised) | 63 |
| Not run | 59 |
| **Total checklist cases** | **135** |

This is still not a full execution of all 135 checklist rows. Reproducible defects were observed: registration accepted an India phone number containing only `123` and created candidate `AV-IKFEJ`; the public blocked-schedule sort reset after reload instead of preserving the selected End-descending order. Most checklist cases remain not run or partial; the local preview does not verify deployed Apps Script or real Google services.

## Walkthrough and evidence

- Opened the website and confirmed the `LOCAL TEST DATA ONLY` notice, welcome page, and visible date/time controls. The current preview rendered styled content.
- Used the public date picker to select 15-10-2026. The public page displayed “No bookings on this date.” This did not exercise a date with occupied intervals or prove privacy for a populated public result.
- Registered a regular QA candidate through the visible form. Candidate `AV-9GM8I` appeared in the candidate dashboard and Admin > Candidates with the entered QA name, email, phone, REGULAR type, and Asia/Calcutta timezone.
- Candidate booked a future technical interview for 12-10-2026, 12:00 PM–12:30 PM Asia/Calcutta. The visible quote returned Available, 30 minutes, $50. Submitted the QA-only reference `QA-20261010-001` with the prefilled $50 amount. Candidate Dashboard showed booking `INT-QCSYC4` as Confirmed / Payment pending.
- Reloaded the candidate page. The authenticated session and booking were restored. Candidate Blocked Schedules for 12-10-2026 showed the booked interval, without candidate identity or payment data.
- Logged in as admin and opened Payments. It displayed `PAY-7GN21W` linked to `INT-QCSYC4`, expected/submitted amounts of $50, and the QA reference. Verified this QA payment only; the saved row changed to Paid & verified and showed a success toast.
- Logged back in as the candidate. The candidate Dashboard showed the same booking and Paid & verified state.
- Opened the cancellation confirmation and dismissed it once; the booking remained unchanged. Reopened and confirmed cancellation. Candidate Dashboard then showed Cancelled and Refund requested.
- Opened Admin > Refunds, completed only the QA refund with a QA-only mock reference, and saw the row change to Refunded. Logged in again as the candidate; the same booking showed Cancelled / Paid & verified / Refunded. Admin and candidate visible states agreed.
- Switched the candidate display preference from 12 hours to 24 hours; the booking times changed from `12:00 PM`/`12:30 PM` to `12:00`/`12:30`. Switched back to 12 hours and confirmed the AM/PM display returned.
- Opened Admin > Candidates, entered edit mode for the QA row, then Cancelled without saving; the row returned to its original values. Opened Settings, recorded the visible existing values, entered edit mode and Cancelled without making changes. Shared settings were not changed.
- Opened Availability and inspected the existing weekly rules: Asia/Kolkata schedule zone, 12:00 PM–8:00 PM for Sunday through Saturday. No rules were modified.
- Tried an intentional wrong QA candidate password using the candidate ID. The UI displayed a generic invalid-ID/password error. A subsequent correct ID login succeeded. Logged out and reloaded; the public welcome page was displayed.
- A browser screenshot was captured during the walkthrough showing the QA candidate dashboard and final Cancelled / Paid & verified / Refunded state. It is session evidence, not a committed image file.
- Continued the walkthrough after the original report: changed QA candidate timezone to America/New_York through Edit/Save and confirmed the booking displayed 02:30 AM–03:00 AM for the same 12-10-2026 interval; restored and saved Asia/Kolkata, and the booking returned to 12:00 PM–12:30 PM.
- Requested QA password recovery through the visible form. The mock notice appeared, wrong recovery code and password mismatch were rejected, and the displayed local recovery code reset the password. The old password failed and the new password succeeded. Then changed the password back through the signed-in Change Password form; the candidate was returned to login and the original QA password was verified.
- Public blocked schedules were queried for 10-10-2026 in Asia/Kolkata and UTC. Both showed three generic Booked intervals without candidate or payment details, with the expected 5.5-hour display shift. A public Start sort/toggle worked and exposed `aria-sort=ascending`; after a timezone change, the visible sort state was not fully verified.
- Continued public schedule checks: clearing the date removed the results and displayed “Select a date to see blocked schedules”; Today restored the 11-10-2026 blocked intervals. Searching the timezone picker for `Not/AZone` returned “No matching timezones”; selecting UTC changed displayed schedule times, and Asia/Kolkata was restored.
- Toggled public Status, Date, Start and End sorting with the three visible rows. Start and End toggles visibly reversed the interval order; Status and Date were only weakly exercised because every row had the same status and date. After selecting End descending and reloading, the page returned to the welcome state with no date selected; selecting Today restored rows in ascending Start order, so the selected sort did not persist through reload. This is a **Fail** for PUBLIC-06. The page was left on the welcome screen with date 11-10-2026 selected and timezone Asia/Calcutta.
- Opened the candidate Blocked Schedules page for the same date. Its Start sort independently toggled from ascending to descending while the welcome page retained the 11-10-2026 results in ascending Start order. Logged out afterward; this is partial evidence for PUBLIC-07, not proof of persisted or complete independent sort behavior.
- Reopened the public date picker and confirmed both Escape and clicking the page heading outside the picker closed it without changing the selected date.
- Navigated the public date picker back to February 2024, selected leap day 29-02-2024, and received “No bookings on this date.” Restored the date to Today (11-10-2026).
- Keyboard navigation from the welcome page focused Candidate Login with a visible focus indicator; Enter opened the login form. Returned to welcome with Back.
- Registration negative validation: mismatched passwords showed “Passwords do not match.” Matching 7-character passwords showed “Password must be between 8 and 1024 characters.” Exited without creating the test account. Password boundary 8/1024/1025 and server-side enforcement were not tested.
- On the candidate booking form for 13-10-2026, selected 00:00, 12:00, 13:05 and 23:59 in 24-hour mode. The picker/table-facing controls displayed the corresponding 12-hour forms (midnight/noon conversion; 1:05 PM and 11:59 PM) after switching back. A temporary earlier-end choice showed “End time must be later than start time”; no quote or booking was submitted. The shared preference was restored to 12 hours.
- Requested an available quote for 13-10-2026, 1:00–1:30 PM Asia/Kolkata (30 minutes, $50). Changing the start time to 1:05 PM removed the Available/Pay & Confirm quote immediately. No payment or booking was submitted.
- Candidate date filter: set the inclusive same-day range 12-10-2026 through 12-10-2026 and saw the QA booking; Tomorrow then produced no-match and Clear filters restored the booking. This did not cover invalid/reversed ranges or all filter combinations.
- Candidate booking form rejected an empty availability request and showed an inline prompt. Setting start and end both to 12:00 PM produced “End time must be later than start time.”
- Registration negative checks: blank submission showed required-fields validation; malformed email was rejected; case-variant duplicate email was rejected. However, submitting a different valid email with phone `123` succeeded and created `AV-IKFEJ` (`+91123`) instead of rejecting it. This is a reproducible **Medium** validation defect in registration; the record remains as QA data.
- Admin Create Booking was opened and its visible fields and candidate choices inspected. It offers candidate/date/start/end/business timezone/type/optional charge override/availability override. No admin booking was submitted during this inspection.
- Admin > Bookings search for `INT-QCSYC4` returned exactly one matching row showing the QA candidate, date/time, $50 charge and paid amount, Paid & verified, Cancelled, Refunded, and no remaining actions. Admin > Candidates search for the invalid-phone QA email returned `AV-IKFEJ` with phone `+91123`.
- Opened Availability, confirmed the saved rules were locked, entered Edit, and Cancelled without saving. All seven weekday rules remained 12:00 PM–8:00 PM in Asia/Kolkata.
- Admin > Bookings search also matched the ID in lowercase. Toggled its ID header twice; only one booking was present, so actual order behavior, other headers and assistive sort state remain unverified.
- In Admin > Payments, the Payment pending filter returned the four pending rows. Opened Change for the QA verified payment, confirmed the saved status was selected, opened its choices, then dismissed and Cancelled without saving; the saved status remained Paid & verified. The status picker/dialog has the accessible name “Interview type,” which is incorrect for a payment status control and may confuse assistive-technology users.
- In Admin > Refunds, the Refunded filter returned only the QA refunded row (`REF-IRHMTU`) from the two displayed refund rows. No refund state was changed in this additional check.
- Opened the seeded pending refund reference dialog, then Cancelled. The dialog closed and `REF-DEMO-2` remained Refund requested; no refund state was changed.
- In Admin > Bookings, Tomorrow on 10-10-26 showed no matching rows; the inclusive 12-10-26 through 12-10-26 range returned the QA booking. The range-filter result is established only for this one row.
- Signed in through the preview with the documented seeded admin account. Dashboard displayed 5 candidates, 3 upcoming bookings, 4 pending payments and 1 refund request; its all-dates view returned eight rows and Refresh reloaded the same counts and rows. Candidate and pending-payment metric cards navigated to the matching pages; other metric cards were not clicked.
- In Admin > Payments, toggled the ID header and saw the four pending sample rows reverse from ascending to descending IDs. This did not test all sortable columns or other admin tables.
- Admin > Candidates search for `QA invalid` returned only `AV-IKFEJ`, confirming a case-insensitive name search. No row was changed.
- Signed in as seeded candidate `AV-BL6NV` (`candidate@example.com`). Its dashboard showed only that candidate's three interviews dated 09-10-26, 10-10-26 and 11-10-26, while admin/public views contained other candidates' records. This is visible-page evidence only and does not prove direct API access controls.
- Candidate filters: Payment pending returned the two pending bookings, Paid & verified returned the matching single booking, and No payment required showed the no-match empty state with the More filters indicator. Clear filters restored the bookings. Yesterday showed the 10-10-26 verified booking; Today showed the 11-10-26 pending booking; Tomorrow showed no matches. Combining Yesterday with Payment pending produced no matches, consistent with the intersection. The session crossed the local date boundary during this run; these observations are tied to the selected date labels and displayed booking dates, not a claim about a fixed runtime clock.
- Candidate Date sort changed the three visible rows from 11-10, 10-10, 09-10 to chronological ascending. Toggling the shared time preference to 24 hours changed the displayed times (e.g. 12:30 PM to 12:30 and 06:30 PM to 18:30); restoring 12 hours returned AM/PM labels.
- Tried candidate seed credentials on Admin Login and admin seed credentials on Candidate Login. Both were rejected with role-specific generic credential errors and no role access. On Admin Forgot Password, a malformed email was rejected with “Enter your admin email.” No code was requested and no admin credentials were changed.
- Admin Create Booking showed candidate/date/start/end/timezone/type/optional charge/override controls and five active candidate choices, including both QA accounts. Submitting the blank form displayed “Select a candidate before creating a booking”; no booking was created.
- Seed candidate Book Interview on 13-10-26: selected 1:00 PM–1:30 PM, requested quote and saw Available, 30 min, $50. Changed type from Technical to Coding and requested quote again; it remained Available with the same displayed duration/charge. Did not click Pay & Confirm; did not establish whether this quote was invalidated/refetched in the exact required sequence after changing date/time.
- Availability Edit enabled the existing seven saved rules. Add Rule displayed a draft BLOCK row with optional full-day inputs. Cancel discarded the draft and restored the locked seven-rule Asia/Kolkata schedule. No shared values were saved.
- From the logged-out welcome page, browser Back did not restore an authenticated page. Cached protected actions were not tested.
- Opened Admin Change Password and submitted all fields blank. The page showed the inline validation message “Password must be between 8 and 1024 characters.” No admin password was changed.

## Case results

For **Not run** rows, no steps were performed; the exact inputs and actions remain in [LOCAL_TEST_CASES.md](./LOCAL_TEST_CASES.md). “Blocked (partial)” means some visible steps were exercised but the complete case expectations were not established, so it is not counted as a pass.

| Case ID | Status | Actual result and exact inputs | Evidence / bug |
| --- | --- | --- | --- |
| ENV-01 | Blocked (partial) | Opened/reloaded the running preview and saw the styled page and local-only banner; no HTML edit in a disposable copy was made. | Browser snapshot; no bug observed |
| ENV-06 | Not run | Not exercised. | — |
| NAV-01 | Blocked (partial) | Opened Candidate Dashboard, Blocked Schedules, Book Interview, and Admin Dashboard, Bookings, Candidates, Payments, Refunds, Availability, Settings and Create Booking. The Change Password tab was not entered; complete navigation round-trips were not checked. | Browser snapshots; no bug observed |
| NAV-02 | Blocked (partial) | Clicked visible navigation, filters, metric cards and action controls; all exercised click targets responded. Tab visibly focused Candidate Login and Enter activated it. Hover effects, other keyboard paths, Refresh hover state and Logout animation were not systematically checked. | Browser keyboard/focus and interaction snapshots |
| NAV-03 | Not run | Not exercised. | — |
| NAV-04 | Not run | Not exercised. | — |
| NAV-05 | Blocked (partial) | Candidate/admin logout returned to the welcome page and reload remained logged out. Browser Back from welcome did not restore an authenticated page; a cached protected action was not tested. | Browser snapshots; no bug observed |
| AUTH-01 | Pass | Registered a new regular QA candidate through the UI with a unique QA name/email, India phone, Asia/Calcutta timezone and matching password. Candidate ID `AV-9GM8I` appeared in candidate and admin views with the entered contact fields. | Candidate dashboard and Admin > Candidates; no bug |
| AUTH-02 | Fail | Blank form and malformed email were rejected, but a registration using phone `123` with India country code, a valid unique email, and matching password succeeded, creating `AV-IKFEJ` with `+91123`. | Admin > Candidates confirmed the stored short number; Medium bug below |
| AUTH-03 | Blocked (partial) | Tried the existing QA email in uppercase; duplicate was rejected. Admin-email reservation and whitespace normalization were not tested. | Registration inline error |
| AUTH-04 | Blocked (partial) | In the visible registration form, mismatched passwords were rejected with “Passwords do not match.” Matching 7-character passwords were rejected with “Password must be between 8 and 1024 characters.” No account was created. Lengths 8, 1024 and 1025 and server-side boundary enforcement were not tested. | Registration inline validation; form exited without submission |
| AUTH-05 | Not run | Not exercised. | — |
| AUTH-06 | Pass | Logged into the same QA account by email and later by generated ID `AV-9GM8I`; both displayed the same candidate profile. | Candidate login/dashboard snapshots; no bug |
| AUTH-07 | Blocked (partial) | Wrong QA candidate password was rejected generically. Seed candidate credentials on Admin Login returned “Invalid admin credentials”; admin credentials on Candidate Login returned “Invalid Candidate ID/email or password.” Both cross-role attempts remained unauthenticated. Other unknown-identifier/reverse-field cases were not tested. | Candidate/Admin login snapshots; no role access observed |
| AUTH-11 | Blocked (partial) | Valid candidate session survived reload and restored the dashboard/booking. Expired, revoked and malformed token cases were not available through visible UI. | Candidate reload snapshot |
| AUTH-12 | Blocked (partial) | Logout and reload returned to welcome; revoked-token reuse and Back/cached-page protected actions were not tested. | Browser snapshot; no bug observed |
| AUTH-14 | Not run | Not exercised. | — |
| PASS-01 | Blocked (partial) | Requested a reset for the QA email and saw the local in-page code notice and recovery form. Delivery and storage were not checked. | Browser snapshot; local mock only |
| PASS-03 | Blocked (partial) | Opened Admin Forgot Password. Malformed email `not-an-email` was rejected inline with “Enter your admin email.” Blank and configured-admin-email code delivery were not attempted; no shared admin credential mutation occurred. | Admin recovery form snapshot |
| PASS-08 | Blocked (partial) | Wrong code and mismatch rejected; local displayed code reset QA password, old password failed and new password succeeded. Reuse of the consumed code was not attempted. | Candidate recovery/login snapshots |
| PASS-11 | Blocked (partial) | Signed-in QA change-password rejected wrong current password and mismatched confirmation. Length boundaries and admin variant were not tested. | Candidate password page inline errors |
| PASS-12 | Blocked (partial) | Successful QA signed-in password change returned to login; original password was restored and successfully used. Admin mutation not attempted. | Candidate password page/login |
| PASS-14 | Blocked (partial) | Dismissed local recovery notice and navigated Back from login; full secret-clearing/navigation cases not tested. | Browser snapshots |
| PUBLIC-01 | Pass | While logged out, queried 10-10-2026 in Asia/Kolkata and UTC. Three generic Booked intervals appeared; no candidate name/ID/contact, booking ID, amount, payment reference, or secret was visible. | Welcome page snapshots; no bug observed |
| PUBLIC-02 | Blocked (partial) | A valid date with no bookings returned an empty result. Clearing the date displayed “Select a date to see blocked schedules,” and Today restored the 11-10-2026 rows. Searching `Not/AZone` in the timezone picker returned no options; an invalid zone submission and impossible date such as 31 February were not tested. | Welcome-page/date/timezone picker snapshots |
| PUBLIC-04 | Pass | Same 10-10-2026 schedule queried in Asia/Kolkata and UTC. The three displayed intervals shifted by 5 hours 30 minutes (15:30–16:00, etc. in Kolkata; 10:00–10:30, etc. UTC). Additional check on 11-10-2026 showed 18:30/19:30/20:30 in Kolkata and 09:00/10:00/11:00 in America/New_York (9.5-hour offset on this October date). The 12↔24-hour preference also changed visible schedule times and was restored to 12 hours. | Public schedule snapshots; no bug observed |
| PUBLIC-06 | Fail | Start and End toggles visibly reordered the three rows; Status/Date were clicked but all rows shared the same status/date, so useful ordering evidence is limited. After End-descending was selected, reload cleared the date and, after selecting Today again, rows returned in ascending Start order rather than the prior End-descending order. Sort did not persist across reload. `aria-sort=ascending` was previously observed for Start; all headers/arrows were not verified. | Public schedule snapshots; sort-reset defect observed |
| PUBLIC-07 | Blocked (partial) | On candidate Blocked Schedules, Start sort toggled to descending while the welcome page retained its ascending Start results for 11-10-2026. This supports independent in-memory sort state across those views; candidate reload/persistence and remaining sort directions were not checked. | Welcome and candidate blocked-schedule snapshots |
| PUBLIC-08 | Not run | Not exercised. | — |
| CAND-01 | Blocked (partial) | QA Dashboard showed the candidate ID/account/timezone and final booking states; long names and the full set of payment/refund states were not available in this QA record. | Candidate dashboard screenshot; no bug observed |
| CAND-02 | Pass | Signed in as `AV-BL6NV` (`candidate@example.com`) while other candidates' records existed in Admin and public views. Candidate Dashboard showed only this candidate's three interviews and a compact ID/account/timezone profile, with no other candidate names or private auth fields. UI-only check; direct API authorization was not tested. | Candidate Dashboard and Admin/public snapshots |
| CAND-03 | Pass | Edited timezone from Asia/Kolkata to America/New_York and saved; booking displayed 02:30–03:00 AM. Restored and saved Asia/Kolkata; original 12:00–12:30 PM display returned. | Candidate dashboard snapshots; no bug observed |
| CAND-05 | Not run | Not exercised. | — |
| CAND-06 | Not run | Not exercised. | — |
| CAND-07 | Blocked (partial) | Seed candidate Payment pending returned two rows, Paid & verified returned one, and No payment required and Refund requested each returned a no-match state with the More filters indicator. Refund requested/Refunded candidate records and all QA pending-work variants were not present. Clear filters after Refund requested restored all three rows. | Candidate Dashboard snapshots; no bug observed |
| CAND-08 | Blocked (partial) | Candidate Today, Tomorrow and Yesterday filters returned the displayed 11-10, no-match, and 10-10 results respectively in the Asia/Kolkata account. Midnight/month/year/leap-day boundaries were not tested; the observed labels are recorded without assuming a fixed clock boundary. | Candidate Dashboard snapshots |
| CAND-09 | Blocked (partial) | Applied inclusive same-day range 12-10-2026 to 12-10-2026 and saw the QA booking. Reversed 13-10-2026 through 12-10-2026 showed “End date must be on or after start date.” Applying with From missing and then To missing showed “Select both dates.” All dates restored the full dashboard. | Candidate dashboard/date-picker snapshots |
| CAND-10 | Blocked (partial) | Combined Yesterday with Payment pending; no row matched, while Yesterday alone showed the verified interview. Date sort toggled between chronological ascending (09, 10, 11-10-26) and descending (11, 10, 09-10-26). All visible rows have $50, so numeric charge ordering could not be assessed. Other columns and all filter combinations were not tested. | Candidate Dashboard snapshots |
| CAND-11 | Blocked (partial) | No-match state from No payment required and from Yesterday + Payment pending offered Clear filters; using it restored all three bookings and reset both filter groups. No zero-booking account was opened to compare the Book Interview suggestion. | Candidate Dashboard snapshots |
| CAND-12 | Blocked (partial) | Future confirmed pending-payment booking dated 11-10-26 displayed Cancel; older bookings dated 09-10-26 and 10-10-26 displayed no cancellation action. Cancelled and just-expired QA variants were not available in this account. | Candidate Dashboard snapshot |
| BOOK-01 | Pass | Selected 12-10-2026, Technical, 12:00 PM–12:30 PM in Asia/Calcutta. The visible quote showed Available, 30 minutes and $50. | Booking form/quote snapshot; no bug |
| BOOK-02 | Blocked (partial) | Empty availability check showed inline required-input prompt. Equal 12:00 PM start/end was rejected with “End time must be later than start time.” A 10-10-2026 12:00–12:30 PM request on the past date was rejected with “Choose a future interview time.” Malformed/reversed values were not tested. No booking was submitted. | Candidate booking form snapshots; quote-only tests |
| BOOK-04 | Blocked (partial) | Requested quote for 13-10-26 1:00–1:30 PM Technical (Available, 30 min, $50); changing start to 1:05 PM removed the quote and Pay & Confirm control. Previous type-change/requote test also returned an updated quote. Date/end/timezone changes after quote were not all checked. No booking/payment was submitted. | Candidate Book Interview quote snapshots |
| BOOK-07 | Blocked (partial) | Submitted a $50 QA-only payment reference for the quote; candidate and admin showed linked booking/payment with matching visible amounts. UTC endpoint values were not exposed in the tested UI and were not independently checked. | Candidate and Admin > Payments snapshots |
| BOOK-08 | Not run | Not exercised. | — |
| BOOK-10 | Not run | Not exercised. | — |
| BOOK-11 | Not run | Not exercised. | — |
| BOOK-13 | Not run | Not exercised. | — |
| BOOK-14 | Not run | Not exercised. | — |
| TIME-01 | Blocked (partial) | Changed the shared 12/24-hour display on candidate Dashboard and welcome schedule; visible table labels updated and were restored to 12 hours. The candidate time picker switched from 12-hour hour/AM-PM controls to 00–23 hour controls without AM/PM and was closed with Escape. Every admin time view/input and underlying drafts were not rechecked. | Candidate Dashboard, booking picker and welcome snapshots; preference restored to 12 hours |
| TIME-02 | Blocked (partial) | On the candidate booking form, selected 00:00, 12:00, 13:05 and 23:59 in 24-hour mode; 12-hour display rendered the afternoon values as 1:05 PM and 11:59 PM. No quote/booking was submitted. The exact 12-hour display for 00:00/12:00 and persistence through saved booking were not independently captured. | Candidate booking time-picker snapshots; format restored |
| TIME-03 | Not run | Not exercised. | — |
| TIME-07 | Not run | Not exercised. | — |
| TIME-08 | Not run | Not exercised. | — |
| TIME-09 | Blocked (partial) | Toggling 12/24-hour preference updated rendered candidate booking times, then 12-hour labels were restored. Arbitrary names/references and all dynamic quote/time surfaces were not exhaustively checked. | Candidate Dashboard snapshots |
| ADMIN-01 | Blocked (partial) | Seed admin login and dashboard Refresh loaded counts (5 candidates, 3 upcoming, 4 pending payments, 1 refund request), eight all-date rows, and the to-do panel without a stuck loader or M_ID popup. The 50-row paging default and settings/availability payload details were not verified. | Admin Dashboard snapshots |
| ADMIN-02 | Blocked (partial) | Dashboard Candidates metric opened Admin > Candidates; Pending payments metric opened Payments with its matching filter. Upcoming/refund cards and global-count behavior were not checked. | Admin Dashboard and list snapshots |
| ADMIN-03 | Not run | Not exercised. | — |
| ADMIN-04 | Blocked (partial) | In Admin > Bookings, toggled ID earlier and toggled Date twice with four filtered rows. Date header exposed `aria-sort=ascending` then `descending`, and row order changed chronologically between 09-10-26 and 11-10-26. Other headers/tables, equal sort values, paging and stable ordering were not verified. | Admin Bookings visible table; multi-row sort |
| ADMIN-05 | Blocked (partial) | Admin > Bookings search matched `INT-QCSYC4` and lowercase `int-qcsyc4`; only one row exists, so cross-page/joined-field search is unverified. | Bookings table snapshot |
| ADMIN-07 | Not run | Not exercised. | — |
| ADMIN-08 | Blocked (partial) | Admin > Bookings accepted and showed the QA row for an inclusive 12-10-26 through 12-10-26 range. Reversed 13-10-26 through 12-10-26 showed “Select a valid start and end date.” Selecting All dates removed the range error and restored four Payment pending rows; selecting All status then restored the unfiltered view. Missing endpoints were not tested in the Admin page. | Admin Bookings visible filters/table |
| ADMIN-09 | Not run | Not exercised. | — |
| ADMIN-11 | Not run | Not exercised. | — |
| ADMIN-12 | Not run | Not exercised. | — |
| ADMIN-13 | Not run | Not exercised. | — |
| ADMIN-15 | Not run | Not exercised. | — |
| ADMIN-16 | Not run | Not exercised. | — |
| CONTACT-01 | Not run | Not exercised. | — |
| CONTACT-02 | Not run | Not exercised. | — |
| CONTACT-03 | Not run | Not exercised. | — |
| CONTACT-07 | Blocked | Admin Candidates showed Edit as the only row action and no visible deactivation control; therefore inactive-candidate filtering and login behavior could not be triggered via the website. | Admin > Candidates snapshot |
| CREATE-01 | Blocked (partial) | Admin Create Booking showed a business-timezone field set to Asia/Kolkata and offered active QA/seed candidates. The specified mismatch with a New York schedule zone and read-only form behavior were not tested. | Admin Create Booking snapshot; no booking created |
| CREATE-02 | Not run | Not exercised. | — |
| CREATE-03 | Not run | Not exercised. | — |
| CREATE-04 | Not run | Not exercised. | — |
| CREATE-06 | Not run | Not exercised. | — |
| CREATE-07 | Not run | Not exercised. | — |
| CREATE-09 | Not run | Not exercised. | — |
| CORRECT-01 | Not run | Not exercised. | — |
| CORRECT-03 | Not run | Not exercised. | — |
| MONEY-01 | Blocked (partial) | Verified the QA payment and confirmed its status in the candidate view; a separate QA payment marked Failed and the full paired comparison were not tested. | Admin > Payments/candidate dashboard snapshots |
| MONEY-02 | Blocked (partial) | Opened Change for the QA VERIFIED payment. Saved status was selected and Save/Cancel were present; the picker/dialog is incorrectly named “Interview type.” FAILED status editor and other label requirements were not checked. | Admin > Payments snapshot; UI naming defect observed |
| MONEY-03 | Blocked (partial) | Opened the QA payment editor, opened and dismissed the status picker, then Cancelled. Saved status remained unchanged; altered-selection, filter/page/rerender persistence cases were not tested. | Admin > Payments snapshots |
| MONEY-04 | Not run | Not exercised. | — |
| CANCEL-01 | Pass | Dismissed the QA booking cancellation confirmation once and confirmed it on a second attempt. The candidate view changed to Cancelled / Refund requested. | Candidate dashboard snapshots; no bug |
| CANCEL-04 | Not run | Not exercised. | — |
| REFUND-01 | Pass | Completed refund `REF-IRHMTU` for QA booking `INT-QCSYC4` with a QA-only reference; Admin > Refunds showed Refunded, and a subsequent candidate login showed the same final state. | Admin > Refunds and candidate dashboard screenshot; no bug |
| REFUND-04 | Not run | Not exercised. | — |
| AV-01 | Pass | Availability opened locked with seven weekly Asia/Kolkata 12:00 PM–8:00 PM rules. Edit enabled controls and Save/Cancel; Add Rule displayed a draft BLOCK row; Cancel discarded it and restored the locked, unchanged seven-rule schedule. | Availability snapshots; no settings saved |
| AV-02 | Not run | Not exercised. | — |
| AV-03 | Not run | Not exercised. | — |
| AV-04 | Not run | Not exercised. | — |
| AV-06 | Not run | Not exercised. | — |
| AV-08 | Not run | Not exercised. | — |
| AV-14 | Not run | Not exercised. | — |
| SET-01 | Blocked (partial) | Settings was previously opened, its existing values captured, and Edit/Cancel returned to the original values. No allowed field was changed or saved because shared configuration must remain untouched. | Admin Settings snapshot |
| WORK-03 | Blocked | Admin dashboard showed 0 failed updates; the pending-work condition was absent. | Dashboard snapshot; no synthetic failure injected |
| WORK-04 | Blocked | Admin dashboard showed 0 failed updates; the pending-work condition was absent. | Dashboard snapshot; no synthetic failure injected |
| WORK-07 | Blocked | Admin dashboard showed 0 failed updates; no matching pending-work error details were available. | Dashboard snapshot; no synthetic failure injected |
| XLSX-01 | Blocked (partial) | Clicked Export Excel on Dashboard, Bookings, Candidates, Payments and Refunds; each showed success feedback with exported record counts (3, 10, 5, 7 and 2 respectively). The downloaded files were not opened/inspected, so file extension, XLSX package validity, mapped columns and content are unverified. | Visible success notifications only; not verified as genuine XLSX |
| XLSX-02 | Not run | Not exercised. | — |
| XLSX-03 | Not run | Not exercised. | — |
| XLSX-04 | Not run | Not exercised. | — |
| XLSX-10 | Not run | Not exercised. | — |
| UI-01 | Blocked (partial) | Candidate cancellation and admin refund-reference flows used in-page dialogs; tested validation errors appeared inline, and successful actions showed in-page feedback. Not every success/error/confirmation was triggered in both roles; no native application alert/prompt/confirm was observed. | Candidate cancellation and Admin Refunds snapshots |
| UI-02 | Blocked (partial) | Dismissed the payment status picker with Escape, cancelled its editor, and cancelled a refund reference dialog; overlays closed and controls remained usable. Focus restoration and every dialog's close path were not verified. | Admin Payments/Refunds snapshots |
| UI-03 | Blocked (partial) | Success feedback was visible after tested booking/payment/refund/profile operations. Toast timeout/close behavior and rule/candidate/settings Save feedback were not all verified. | Existing journey snapshots |
| UI-04 | Blocked (partial) | Used visible pickers for public lookup, candidate/admin ranges and navigated 32 months back to February 2024; 29-02-2024 was selectable and returned an empty public result. Today/Clear and valid ranges worked in earlier checks. Change-event details, invalid-date injection and all picker variants were not verified. | Public, candidate and Admin date-picker snapshots |
| UI-05 | Blocked (partial) | Used the visible 12-hour picker to select noon and 12:30 PM for a past-date quote; the past time was rejected. In 24-hour mode the picker exposed 00–23 hours and no AM/PM control; selected 00:00, 12:00, 13:05 and 23:59, then confirmed 1:05 PM and 11:59 PM in 12-hour form. Escape closed the picker. Complete quote invalidation/draft/disabled-control checks were not done. | Candidate time-picker and Dashboard/public snapshots; preference restored |
| UI-06 | Blocked (partial) | Opened timezone picker, searched `UTC`, selected it, then restored Asia/Kolkata. Also selected America/New_York for the public table and restored Asia/Kolkata. Interview-type picker/no-result behavior not checked. | Public and candidate timezone-picker snapshots |
| UI-07 | Blocked (partial) | Public date picker closed on Escape and on clicking outside at the page heading; the selected date remained unchanged. Picker positioning near viewport edges, scrolling/resizing, Tab, focus return and candidate/admin pickers were not checked. | Welcome-page date picker snapshots |
| UI-09 | Not run | Not exercised. | — |
| UI-10 | Not run | Not exercised. | — |
| UI-12 | Blocked (partial) | Refreshed Admin Dashboard and exercised candidate timezone Edit/Cancel/Save and availability Edit/Cancel without a visible stuck loader or M_ID message. Browser console/error monitoring and repeated handler/race checks were not performed. | Admin and Candidate snapshots |
| FLOW-01 | Blocked (partial) | Created and reloaded the QA booking, then observed the linked candidate/payment in admin and candidate views. Independently checking UTC endpoints was not possible through the visible fields exercised. | Candidate and Admin > Payments snapshots |
| FLOW-02 | Pass | Admin verified QA payment; candidate refreshed/logged in and saw Paid & verified; candidate cancelled; admin completed refund; candidate subsequently showed the matching Refunded state. | Candidate dashboard and Admin > Payments/Refunds snapshots; no bug |
| FLOW-03 | Not run | Not exercised. | — |
| FLOW-04 | Not run | Not exercised. | — |
| FLOW-05 | Not run | Not exercised. | — |
| FLOW-06 | Not run | Not exercised. | — |
| MANUAL-01 | Blocked (partial) | Registered and logged in by email and ID; one wrong password was rejected and correct credentials worked. Logout then re-login by ID worked. Full specified step ordering was not repeated exactly. | Candidate login snapshots |
| MANUAL-02 | Not run | Not exercised. | — |
| MANUAL-03 | Blocked (partial) | Wrong code and mismatched reset passwords rejected; displayed local code successfully reset QA account. Old password rejected and new password worked. One-time code reuse was not tested. | Recovery and login snapshots |
| MANUAL-04 | Not run | Not exercised. | — |
| MANUAL-05 | Blocked (partial) | Opened Admin Forgot Password, submitted malformed `not-an-email` and saw inline validation, then returned to Admin Login. No recovery code was requested; shared admin reset/change was not attempted. | Admin recovery/login snapshots |
| MANUAL-06 | Blocked (partial) | Wrong current password and mismatched new-password confirmation rejected inline. Successful password change worked and session returned to login; restored original QA password. | Change Password/login snapshots |
| MANUAL-07 | Not run | Not exercised. | — |
| MANUAL-08 | Blocked (partial) | Opened Edit for the QA candidate and Cancelled; the original row was restored. Save and invalid-input variants were not tested. | Admin > Candidates snapshot |
| MANUAL-09 | Blocked (partial) | Opened Admin Create Booking and inspected candidate/date/start/end/business zone/type/charge override/availability override fields and five candidate choices, including both QA candidates. Blank submission showed “Select a candidate before creating a booking.” No booking mutation or invalid-charge/override test performed. | Admin Create Booking snapshot; no booking created |
| MANUAL-10 | Not run | Not exercised. | — |
| MANUAL-11 | Blocked (partial) | Captured visible settings and schedule rules; Settings Edit/Cancel was checked. Availability Edit/Add Rule/Cancel discarded the temporary BLOCK row and restored the seven Asia/Kolkata rules. No shared values were changed; save/restore of timezone, price or buffer values was not attempted. | Admin Settings and Availability snapshots |
| MANUAL-12 | Blocked | Admin dashboard showed 0 failed updates; no QA pending-work job was available. | Dashboard snapshot |
| MANUAL-13 | Not run | Not exercised. | — |
| MANUAL-14 | Blocked (partial) | Cancelled a changed QA payment-status draft; saved status stayed Paid & verified. Dismissed a refund reference dialog and confirmed the seeded refund stayed Refund requested. Full booking editor/nav-away cases were not repeated. | Admin Payments/Refunds snapshots |

## Findings, cleanup, and limitations

- **Medium — registration accepts an invalid short phone number.** Repeat: open Register, enter a name and unique valid email, leave country code India (+91), enter phone `123`, set matching valid passwords, submit. Expected: reject the incomplete phone and create no account. Actual: registration succeeded and created `AV-IKFEJ`, stored/displayed as `+91123`. This may leave an unusable contact number in the candidate record. QA candidate affected: `AV-IKFEJ`. Evidence: registration success dashboard and Admin > Candidates row/search showing `+91123`. This defect is recorded; no source changes were made because this is a test-only request.
- **Low — payment status picker is mislabeled.** On Admin > Payments, open Change for a verified payment. The status values are correct, but the button, listbox, and dialog are labeled “Interview type.” Expected: a payment-status label. Actual: the picker exposes an unrelated interview-type label to users and assistive technology. The editor was dismissed and cancelled without changing payment data.
- **Low — public schedule sort does not persist across reload.** On the welcome page, select a date, choose End descending and reload. After selecting the date again, the table returned to ascending Start order. The checklist expects sort state to persist per table; no record data was changed.
- No shared Settings or Availability values were changed. Admin Settings Edit/Cancel returned to the original locked values; Availability was inspected only.
- QA candidate `AV-9GM8I`, its cancelled booking, verified payment and completed refund remain in the in-memory preview. QA candidate `AV-IKFEJ` created during the invalid-phone test also remains. They were intentionally not deleted. Do not restart the preview if these records must remain visible.
- Payment and refund references were mock test data only. No real payment or refund was initiated.
- Not tested: most edge cases, impossible public dates/invalid zone submission, candidate blocked-schedule sorting persistence and all sort directions, recovery-code reuse, admin password change, timezone/DST boundaries, admin booking creation, broad admin booking edits, export download contents, large-data paging, alternate payment/refund mutations, accessibility/reduced-motion/responsive checks, two-session revocation, and deployed Apps Script behavior. The exercised candidate recovery/change flow used only local preview mocks.
- The preview cannot establish Google authorization/scopes/quotas, real Sheets persistence, actual mail delivery, Calendar/Contacts operations, production concurrency, or deployed Apps Script performance. These require separate authorized testing after deployment.
