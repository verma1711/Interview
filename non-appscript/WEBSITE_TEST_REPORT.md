# Website walkthrough reports

## Live daylight-saving checks — 2026-10-11

**All six tested New York quote variants passed.** Used actual live browser input with QA candidate AV-0ZGAG temporarily saved to America/New_York,24-hour display. No booking confirmation or payment was submitted. Transition dates were cross-checked with [New York clock changes](https://www.timeanddate.com/time/change/usa/new-york-state?year=2027).

| Future date and local time | Expected / actual live result | Result |
| --- | --- | --- |
|01Nov2026 01:30–02:30 | Start occurs twice when clocks go back; quote rejected explicitly as ambiguous. | Pass |
|14Mar2027 02:30–03:30 | Start does not exist when clocks go forward; quote rejected explicitly for daylight-saving change. | Pass |
|31Oct2026 12:00–12:30 | Available30minutes/$50; rendered quote UTC attributes16:00–16:30Z (UTC−4). | Pass |
|01Nov2026 12:00–12:30 | Available30minutes/$50; UTC17:00–17:30Z (UTC−5). | Pass |
|13Mar2027 12:00–12:30 | Available30minutes/$50; UTC17:00–17:30Z (UTC−5). | Pass |
|14Mar2027 12:00–12:30 | Available30minutes/$50; UTC16:00–16:30Z (UTC−4). | Pass |

Evidence: observations `dst-fall-20261101-ambiguous`, `dst-spring-20270314-gap`, `dst-spring-before-noon`/`after-noon`, `dst-fall-before-noon`/`after-noon`, and corresponding `*-utc` labels. UTC evidence reads the actual rendered quote's `data-timestamp` attributes; it does not inject state or call application RPC directly. Added observational `timestamps` command to the browser driver for these attributes. Early missing-selector attempt was a driver targeting error, not a website failure.

Restored candidate Asia/Calcutta and12-hour display (`dst-profile-restored`), then signed out. Shared business/availability settings unchanged. No new candidate, booking/payment/refund, external-service verification, source application fix, push or deployment. These passes cover candidate quote gap/overlap rejection and normal working-hour UTC shifts around both transitions. They do not prove complete PUBLIC-08/TIME DST cases: admin override intervals spanning the actual clock jump, persisted bookings, public occupied schedules on transition dates and calendar/email output remain untested.

## Pending-test continuation: sorting and time display — 2026-10-11

Actual live Edge clicks/typing exercised all nine candidate data-column headers twice on the four existing QA bookings. No application API calls or browser-storage edits were used.

| Check | Observed result | Status |
| --- | --- | --- |
| ID | Ascending0JGTRT,HY5V4X,WDW9KO,YN6ZA1; second click reversed order. | Pass |
| Date |16Oct rows,20Oct,23Oct ascending; second click reversed. | Pass |
| Start |08:30,21:30,22:00,23:30 ascending; second click reversed. | Pass |
| End |00:00,10:30,22:00,22:30 ascending; second click reversed. Sorting uses local time-of-day as documented; Next day remains attached to00:00. | Pass |
| Payment verification / Refund status | No payment required/No refund rows grouped first; reverse put Paid & verified/Refunded first. | Pass for existing states |
| Charge | Charge0 first ascending and last descending;50 rows remained together. | Pass for existing0/50 values |
| Type / Booking status | Both headers clicked in both directions; order stayed unchanged because all rows were Technical/Cancelled. | Partial: need different values to prove ordering |
| TIME-02 minute display | Set Start13:05 and End23:59 using24-hour picker. Toggle12 showed1:05PM and11:59PM. Earlier live runs separately displayed00:00 and12:00. | Pass for observed minute conversions |
| Saved hour preference | Set candidate24hours, reload actual page, valid session restored and dashboard displayed08:30/22:00/23:30/00:00. | Pass for this account's reload persistence; multi-account independence not tested here |

Evidence: browser log labels `pending3-sort-<column>-first` and `-reverse`, `pending3-minute24`, `pending3-minute12`, `pending3-format24-reload`. CAND-10 is still not a complete pass for every status/date/sort combination and distinct Type/Booking status values. TIME-03 still needs a second candidate and admin preference comparison. No new defect found in these checks.

Restored candidate12hours and signed out (`pending3-final-signed-out`). No new registration, booking, payment/refund, shared settings change, source fix, push or deployment. Inbox/external service checks, multi-session behavior, expiration, DST transitions, large datasets and remaining accessibility/variant coverage remain pending.

## Live Cancel-fix recheck — 2026-10-11

**L-04 passed on the user-supplied live URL.** Actual Edge input: Admin Candidates → Edit AV-0ZGAG → percentage101 → Save. The expected invalid-percentage error appeared. Cancel then removed the error, restored REGULAR0 and original email/phone, locked all fields and restored Edit. Evidence labels `redeploy-cancel-invalid-error` and `redeploy-cancel-error-cleared` in the masked browser observation log. No valid save, new records, shared configuration changes or deployment performed in this recheck; signed out afterwards. The deployed version number was not independently inspected. Other previously pending tests remain pending.

## Latest source upload — 2026-10-11

`clasp push --force` successfully uploaded all ten production files, including the L-04 candidate Cancel fix. `clasp status` confirmed local tests/reports were excluded. This uploads source to the Apps Script project; the Web app was not redeployed. The live101 → Save → Cancel recheck remains pending after deployment.

## Cancel-error fix and further live checks — 2026-10-11

L-04 is now fixed in local `Index.html`: candidate Edit/Cancel clears the row's old validation content; Cancel still restores and locks saved fields. `node non-appscript/tests/candidate-cancel.test.cjs` passed the focused DOM-stub regression, and `admin-improvements.test.cjs` passed its mocked checks. These are local technical checks, not browser proof of the deployed fix. No push or deployment performed; the next deployment still needs the live101 → Save → Cancel recheck.

Additional actual live browser checks passed: registration rejected an existing email entered in uppercase with surrounding spaces; registration rejected the reserved admin email; candidate login accepted the existing email with uppercase/spaces and opened the correct AV-0ZGAG profile; Escape closed the time picker without changing the22:00 input. Evidence labels: `pending2-duplicate-normalized-email`, `pending2-admin-email-reserved`, `pending2-normalized-login`, `pending2-timepicker-escape`. No new candidate, booking or payment created in these checks. Remaining inbox/external service, concurrency, expiry, DST and large-data limitations still apply.

## Next deployment reminder — 2026-10-11

The user subsequently authorized the fix: L-04 is fixed locally as described above. After the next deployment, repeat Edit → percentage101 → Save → Cancel: original values must be restored, fields locked and error removed. Live verification of the new fix is still pending.

## More pending live tests — 2026-10-11

Continued on the same live Apps Script URL using actual Edge mouse clicks and keyboard input. This is additional browser evidence, not a Node/mock test run. The tables below describe the variants actually exercised; the older 135-case inventory remains historical and is not a current completion count.

| Check | Actual live result | Result for tested variant |
| --- | --- | --- |
| Percentage candidate booking / BOOK-10 | Temporarily changed QA candidate AV-0ZGAG to PERCENTAGE20. Candidate booked20Oct22:00–22:30 India; INT-WDW9KO confirmed with No payment required, charge50, and no payment ledger row. | Pass |
| Percentage boundaries |101 and -1 were rejected; Cancel restored saved20. Later restored REGULAR0. | Pass for validation; see L-04 below |
| Candidate date/status filters / CAND-09 | Same-day20Oct range included its booking; No payment required plus date matched; Paid & verified plus date was empty; Clear filters restored all rows. Missing/reversed endpoints were checked in the earlier run. | Pass for listed variants; other combinations not exhaustive |
| Admin booking draft and charge | Charge77 draft survived navigation away and back; Discard restored50. Saved0 successfully, then restored50. | Pass |
| Admin overnight / CREATE-04 |23:00–01:00 without confirmation rejected. With confirmation but without Override, outside-hours error appeared. With Override and charge0, INT-HY5V4X was created for22Oct23:00–23Oct01:00 New York. | Pass |
| Overnight conversion | Admin End displayed Next day23Oct. Candidate India displayed23Oct08:30–10:30, without a misleading next-day label. | Pass |
| Candidate time validation | Reversed23:00–01:30 rejected; equal22:00–22:00 rejected. Candidate form exposed no overnight confirmation. | Pass |
| No-payment cancellation | Candidate cancelled both new bookings. Both became Cancelled/No refund, with no additional payment/refund rows. | Pass |
| Multi-field Cancel / CONTACT-03 | Draft email, phone, type and percentage changes were discarded; original values and picker labels restored and locked. | Pass for visible restoration; no direct RPC monitoring |
| Full-day availability block | Added24Oct BLOCK with empty start/end. Candidate quote on that date rejected as blocked. Removed only that temporary rule and saved; original seven weekday rules re-read. | Pass for full-day block; partial/overnight block variants remain untested |
| Dashboard links | Candidate metric opened Candidates with old search cleared; upcoming metric showed the one upcoming QA booking. Pending payment/refund metrics opened the corresponding filtered empty pages. | Pass for observed navigation; positive pending/refund counts not exercised here |
| Admin date range | Missing/reversed range rejected with inline message.20–22Oct inclusive range returned the20Oct and22Oct QA bookings. All dates restored all four records. | Pass |
| Payment/refund date / ADMIN-07 |16Oct range returned the two records associated with16Oct interviews although those records were created earlier. | Pass for observed interview-date filtering |
| Candidate table Name sorting | First click ordered QA Browser before QA Live; second click reversed them. | Pass for Name in both directions; all other columns not claimed |

**New finding L-04 — Low: error stays after Cancel.** Admin Candidates → Edit AV-0ZGAG → percentage101 → Save → Cancel. Original REGULAR0 and original contact values were restored, but the message “Percentage must be a valid non-negative number no greater than100” remained under the locked row. Navigating back to Candidates cleared it. Expected: Cancel should also clear the discarded draft's error. Reproduced independently after restoring the account. No fix or deployment performed in this testing task. Evidence: `pending-stale-validation-after-cancel`; [screenshot](local-preview/qa-live-20261011-cancel-validation.png).

Evidence is in [the browser observation log](local-preview/qa-live-20261011-observations.jsonl), labels beginning `pending-`. Key observations: `pending-percentage-booked`, `pending-admin-overnight-created`, `pending-admin-overnight-view`, `pending-candidate-overnight-display`, `pending-equal-times-rejected-actual`, `pending-contact-multifield-cancel`, `pending-full-day-block-rejected`, `pending-availability-restored`, `pending-admin-inclusive-range`, `pending-payment-interview-date-filter`, `pending-refund-interview-date-filter`, and `pending-candidate-name-sort-first`/`reverse`. [Admin overnight screenshot](local-preview/qa-live-20261011-overnight-admin.png).

Do not treat misleading early labels as proof: `pending-candidate-equal-rejected` actually showed01:00–01:30, so only the later equal-times observation supports that rejection. Search observations captured asynchronous loading or stale results and are not counted as passes. `pending-final-signed-out-verified` is the actual welcome-screen logout confirmation.

Cleanup: new QA bookings INT-WDW9KO and INT-HY5V4X remain as cancelled test history. Existing payment/refund rows are unchanged. AV-0ZGAG is restored to REGULAR0, its original email/phone, Asia/Calcutta and12hours. General and availability zones remain America/New_York; original seven Sun–Sat12:00–20:00 availability rules restored, temporary block removed. Shared credentials unchanged. Signed out at the end. No real bank payment/refund, reset, source fix or deployment performed. Automatic external Calendar/email/contact work may occur during normal live actions; external delivery/results were not independently inspected.

Still pending: email recovery/code checks require access to a test inbox; external Calendar/Contacts/email results require service inspection. Multi-session races/revocation, session expiry, future DST gaps/overlaps, large-data pagination/export, complete keyboard/accessibility coverage and all remaining checklist variants have not been verified. These limitations are not passing results.

## Live fix recheck — 2026-10-11

Target: [current live website](https://script.google.com/macros/s/AKfycbxZIpx_VhaMuRtATw1D14Bl6xjxQSL8eVbO_0RJV-7WLp0izAsrTi1tyswDgbZPHz2c/exec). **All three focused bug rechecks passed through actual Edge browser clicks and typing.** The updated behavior is now visible live. The Apps Script deployment version number was not independently inspected.

| Previous defect / case | Live input and actual result | Recheck |
| --- | --- | --- |
| L-01 / AUTH-02 | India+91, phone123, QA Live Fix Recheck, qa.fix.recheck.20261011@example.com, matching passwords: inline complete-phone error. Registration remained open. Admin Candidates still contained the original two QA accounts; no new candidate created. | Pass for reported short-phone defect |
| L-02 / TIME-01, TIME-09 | Existing AV-0ZGAG; Technical quote20-10-26,22:00–22:30 Asia/Calcutta.24hours displayed22:00–22:30 in both inputs and quote;12hours displayed10:00PM–10:30PM in both.30minutes/$50 unchanged. | Pass for reported quote-format defect |
| L-03 / UI-06 | Admin Payments→Change on PAY-8PJ8DT: trigger aria name Payment status: Paid & verified. Admin Candidates triggers: Account type: REGULAR. Cancel closed payment editor without saving. | Pass for reported picker-name defect |

Evidence: `local-preview/qa-live-20261011-observations.jsonl` labels `live-fix-phone-final`, `live-fix-quote24-final`, `live-fix-quote12-final`, `live-fix-payment-label-final`, `live-fix-account-label-final`; [24-hour live quote screenshot](local-preview/qa-live-20261011-fixed-quote24.png). Early browser-driver attempts after reload did not reach the forms and are not passing evidence. The driver now brings the live tab to the foreground and uses immediate scrolling before physical mouse input; no app RPC or stored browser state was injected.

No new booking/payment/refund submitted, shared settings/profile/credentials changed, deployment performed or reset in this recheck. Restored candidate display to12hours and signed out both roles. These focused passes resolve the previously reported defects; they do not turn every variant of the four broad checklist cases, or the full135-case inventory, into a verified Pass. Historical results below remain dated evidence. No Node application suite rerun during this live browser-only recheck.

## Fix follow-up — 2026-10-11 (local only)

Implemented fixes for the three bugs behind AUTH-02, TIME-01, TIME-09 and UI-06. On 2026-10-11, `clasp push --force` successfully uploaded all ten production files to the configured Apps Script project. Historical live failures below remain valid for the deployed version; **source is pushed, but the Web app deployment has not been updated or retested live**.

| Finding | Local browser recheck | Result |
| --- | --- | --- |
| L-01 / AUTH-02 | Registration phone123 with India+91 and matching passwords | Clear incomplete-phone error; no registration. Server regression separately checks rejection before account creation. |
| L-02 / TIME-01, TIME-09 | Candidate quote20-10-26,12:00–12:30 Asia/Kolkata; toggle24 then12 | Quote displays12:00–12:30, then12:00PM–12:30PM.30minutes/$50 stays unchanged. |
| L-03 / UI-06 | Admin Payments Change and Candidates | Pickers expose Payment status and Account type; no unrelated Interview type name. |

Evidence: `local-preview/qa-20261011-observations.jsonl`, labels `fix-short-phone-rejected-confirmed`, `fix-isolated-payment-label`, `fix-isolated-account-label`, `fix-isolated-quote24`, `fix-isolated-quote12`. Actual browser clicks/typing were used. The existing8787 preview stalled during admin login; an isolated temporary8792 preview loaded the updated source/mocks and supplied the remaining browser checks. No existing preview data reset, live records changed, new booking submitted, real payment or deployment. The temporary preview was stopped after testing.

Regression validation: **all 14 mocked test files passed** in the final full-suite run. An initial run exposed a picker test stub missing DOM label APIs; the stub was updated and payment/account naming regressions added before rerunning. Invalid-phone server regressions also prove no candidate is created. This is additional technical verification, not a substitute for the browser rechecks or proof of live deployment.

## Live browser follow-up — authenticated admin and candidate

Run date: **2026-10-11, Asia/Calcutta**. Target: [live Apps Script website](https://script.google.com/macros/s/AKfycbxZIpx_VhaMuRtATw1D14Bl6xjxQSL8eVbO_0RJV-7WLp0izAsrTi1tyswDgbZPHz2c/exec), same URL labeled version18 in the earlier report; deployment version was not independently re-inspected in this run. Browser: Edge via its remote-debugging connection. Actual mouse/keyboard input was used on visible forms, including the nested Apps Script iframe. Native window was about756×488; desktop screenshots used1920×1080. A temporary1365×950 override was not persistent between driver connections, so do not describe the whole run as1365px.

No Node application test suite, direct RPC call, fixture screen, source assertion, browser-storage edit or deployment was used as website evidence. Node only drove real browser input and assembled this document; the ZIP/XML check below is separately identified as supplemental artifact inspection. Password fields were masked in recorded snapshots. Existing source changes were preserved; no application fix was made in this task.

**Inventory: 135 cases — 24 Pass, 4 Fail, 40 Blocked, 67 Not run.** Partially exercised cases are not full passes. Several cases share one defect; case failures are not the number of unique bugs. This is a substantial live follow-up, not a claim that all135 cases passed or that the site is fully verified. Historical local results below are not included in these counts.

### Findings requiring fixes

1. **L-01 — Medium: short phone accepted at registration (reproduced).** Register a QA account with India+91 and phone123, valid email/name and matching policy-length passwords. Expected rejection before account creation; actual AV-0ZGAG created and admin displayed91123. Corrected only this account through Admin Candidates to+919999999911. Evidence: [registration screenshot](local-preview/qa-live-20261011-registration-complete.png), observation labels live-phone-registration-retest/live-contact-valid-save. Existing earlier AV-NP1P2 was not altered.
2. **L-02 — Low: quote ignores 24-hour display preference (reproduced twice).** Candidate NY,16-10-26,12:00–12:30,Technical → Check availability & price →24hours. Inputs show12:00/12:30, but available summary keeps12:00 PM EDT/12:30 PM EDT. Expected24hour summary too. Times/price themselves remained correct. [Screenshot](local-preview/qa-live-20261011-quote-format24.png); live-quote-format24-reproduced. No source fix/deployment claimed.
3. **L-03 — Low: unrelated picker label (reproduced).** Admin Payments → Change → status picker. Options are payment states but dialog/aria name says Interview type; candidate account type is similarly mislabeled. Expected relevant payment/account label. [Screenshot](local-preview/qa-live-20261011-payment-label.png). Cancel behavior itself passed after an altered selection, and there was no reason field or Update payment status heading.

### Successful journeys and clarification of earlier results

- Live admin login worked with the current user-supplied credentials; an earlier supplied obsolete password failed once. Shared admin credentials were never changed/reset. Admin refresh and general-zone changes did not reproduce M_ID in the observed operations.
- Saved working hours are New York12:00–20:00 on all seven weekdays. India daytime quote rejection in the earlier report was expected under that configuration, rather than proof of broken availability. NY16Oct noon produced successful30/40/90minute quotes at$50/$70/$120.
- Availability Edit/Cancel and unchanged Save worked. Temporarily saving general zone Kolkata left schedule zone New York and Create Booking New York. Restored general zone New York and re-read the Settings. [Independent-zone screenshot](local-preview/qa-live-20261011-independent-zone.png).
- Admin QA creation, paid-amount correction, payment Failed→Verified, altered-draft Cancel, candidate cancellation and refund completion worked. Refunded payment could not become Failed: A refunded payment must remain verified.
- Candidate submission produced one confirmed pending-payment booking, persisted after browser refresh and matched admin linked records. Verification/cancellation/refund then matched both roles. Public schedules showed only occupied times; India/New York/UTC conversion agreed. Candidate table Start sorting and populated payment/refund filters worked.
- NY14:00–14:30 on16Oct appeared India23:30–00:00 with Next day ·17-10-26; same-day End had no extra date. Header24 produced23:30/00:00 correctly in the table. The failed quote-summary format is a separate display defect.
- Earlier public-sort report used full browser reload. The guide describes in-memory sort preservation when results are refreshed, not persistence across a new page load. That earlier reload observation is not sufficient to classify a defect. This run clicked End and re-requested results, but one active row did not prove multi-row ordering or every header.

### Evidence, downloads and testing limits

The [live observation log](local-preview/qa-live-20261011-observations.jsonl) contains timestamped visible text and controls; passwords are masked. Some early labels precede a mis-targeted click or a request completing. Use the **actual recorded text**, and the later explicitly identified successful observations in the inventory. A driver target-missing error is not automatically an application defect. In particular live-settings-restored still showedKolkata; **live-settings-restored-verified** is the actual New York restoration. Likewise live-public-populated-new-york still showedIndia; **live-public-new-york-actual** is the corrected selection.

Actual browser download completion events and saved files confirmed all five exports in [qa-live-downloads](local-preview/qa-live-downloads/): candidates4949bytes, bookings6490, payments5905, refunds5771, dashboard5436. Files were exported before the second candidate-created booking. Filtered Candidates contained only AV-0ZGAG. Supplemental local ZIP/XML inspection found six package entries, header+one data row in each populated export and header-only Dashboard. No available spreadsheet viewer was opened, so rendered cell formatting/content comparison remains Blocked. The filename date2026-10-10 was the general New York date at export time, not an India-date defect. Initial export clicks showed a toast but did not save to the requested folder; repeated clicks with the browser download connection held open produced the actual artifacts. The first toast alone was not counted as a download pass.

Recovery delivery/code handling, real Calendar/Contacts/email results, two-session concurrency, session expiration/lock waits, future DST gaps/overlaps, >50-row paging, >100-row export and full keyboard/accessibility/long-content testing remain unverified. No fake failure or large dataset was injected. Per-connection exception capture is not exhaustive continuous console monitoring. No actual bank payment/refund was made; test amounts/references are QA ledger entries only.

### Data changes and cleanup

Live QA candidate **AV-0ZGAG**, QA Browser Live20261011, qa.browser.live.20261011@example.com remains. Phone corrected to+919999999911; profile restored Asia/Calcutta and12hours. Its password was changed for QA, then restored and successfully used to sign in. Existing **AV-NP1P2** left unchanged. Final browser reload remained signed out.

| QA booking | Payment | Refund | Final state |
| --- | --- | --- | --- |
| INT-YN6ZA1 (admin-created NY16Oct14:00–14:30) | PAY-8PJ8DT expected/submitted50 | REF-K3GUZ5, QA-LIVE-REFUND-20261011 | Cancelled / Verified / Refunded |
| INT-0JGTRT (candidate-created NY16Oct12:00–12:30; QA-LIVE-20261011-002) | PAY-IU28R9 expected/submitted50 | REF-RJIOSL, QA-LIVE-REFUND-20261011-002 | Cancelled / Verified / Refunded |

Shared configuration restored: BUSINESS_TIMEZONE and AVAILABILITY_TIMEZONE America/New_York; seven WEEKLY Sun–Sat12:00–20:00; buffers30/30; UPI CHANGE_ME@upi; QRblank; threshold30; prices50/70; Calendar name Interview Bookings. Availability Save rewrote the same original rules without changing their intended behavior. No data reset/deletion/deployment. Registration and bookings may trigger actual Contacts/Calendar/email work automatically; their external effects were **not** independently inspected, so this run does not claim those services were untouched or verified. QA cancelled/refunded rows remain as test evidence; cancelled slots no longer occupy the public schedule.

Some local preview UI checks occurred before the user clarified **live**. They are separate supplemental observations, excluded from live counts: local AV-CJXB1, INT-U2O63D, PAY-9MNXI3 remain; local paid amount was corrected to50, payment Verified, booking still Confirmed. Local shared zones restored Asia/Kolkata. The local [observation log](local-preview/qa-20261011-observations.jsonl) is historical supplemental evidence, not live verification. No preview restart/reset was performed.

### Full135-case accounting for this follow-up

| Case ID | Status | Actual result / inputs / missing checks | Evidence |
| --- | --- | --- | --- |
| ENV-01 | Blocked | Local preview banner, edited disposable HTML and injected local malformed responses are outside the user-selected live target. | Live target selection |
| ENV-06 | Blocked | Local preview banner, edited disposable HTML and injected local malformed responses are outside the user-selected live target. | Live target selection |
| NAV-01 | Pass | Opened every candidate/admin tab and returned to Dashboard. Correct visible content; no duplicate panel observed. | live-admin-refresh; live-original-settings; live-availability-locked; password snapshots |
| NAV-02 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| NAV-03 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| NAV-04 | Pass | Narrow native browser view retained desktop columns with page scrolling; 1920×1080 screenshots retained desktop layout. | qa-live-20261011-quote-format24.png; overnight-india.png |
| NAV-05 | Not run (partial) | Logout returned welcome; actual reload stayed signed out. Browser Back/cache-protected-action variant not exercised. | live-final-signed-out |
| AUTH-01 | Not run (partial) | QA account AV-0ZGAG created with the expected name/email/REGULAR profile. Short phone was accepted (L-01); admin subsequently corrected it to +919999999911. A fully valid registration was not separately repeated. | live-phone-registration-retest; live-contact-valid-save |
| AUTH-02 | Fail | Blank, bad-address email and password mismatches were rejected; phone 123 with India +91 was accepted and created AV-0ZGAG. Invalid-zone variant not exercised. | L-01; live-phone-registration-retest |
| AUTH-03 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| AUTH-04 | Not run (partial) | Mismatch and matching 7-character registration passwords rejected. 8/1024/1025 boundaries not exercised. | live-password-mismatch; live-seven-character-password |
| AUTH-05 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| AUTH-06 | Pass | Email qa.browser.live.20261011@example.com and ID AV-0ZGAG both opened the same QA profile. | live-candidate-email-login; live-candidate-verified-booking |
| AUTH-07 | Not run (partial) | One obsolete admin-password attempt rejected; user-supplied current password succeeded. Blank email rejected. Unknown identifiers and cross-role credentials not tested. | live-admin-authenticated; live-admin-login-result |
| AUTH-11 | Blocked (partial) | Actual browser reload restored the valid candidate session. Expired/revoked/malformed-token variants unavailable without waiting or editing browser state. | live-candidate-reload-two-bookings |
| AUTH-12 | Not run (partial) | Logout returned welcome; actual reload stayed signed out. Browser Back/cache-protected-action variant not exercised. | live-final-signed-out |
| AUTH-14 | Blocked | A second simultaneous authenticated browser session was not established; no simulated concurrency or storage manipulation used. | Browser observation log |
| PASS-01 | Blocked | Live website does not expose mock recovery codes; access to QA email inbox unavailable. No reset mail was requested and no expiry/throttle result is claimed. | Browser observation log |
| PASS-03 | Blocked (partial) | Admin Forgot password form opened; malformed email not-an-email rejected. Shared admin password reset/change was not authorized; no reset email sent. | live-admin-recovery-invalid-email |
| PASS-08 | Blocked | Live website does not expose mock recovery codes; access to QA email inbox unavailable. No reset mail was requested and no expiry/throttle result is claimed. | Browser observation log |
| PASS-11 | Not run (partial) | Candidate/admin wrong-current and new-password mismatch errors were inline. Short/long Change Password boundaries not performed in both roles. | live-password-wrong-current; live-password-mismatch-change; live-admin-password-wrong-current; live-admin-password-mismatch |
| PASS-12 | Blocked (partial) | QA candidate changed password: signed out with inline success, old login rejected, new login succeeded. Restored original QA password and confirmed final login. Recovery/pending-code invalidation not checked; successful shared-admin credential changes not authorized. | live-QA-password-changed; live-old-QA-password-rejected; live-new-QA-password-login; live-QA-password-restored; live-final-candidate-state |
| PASS-14 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| PUBLIC-01 | Pass | Signed-out lookup for 16-10-26 showed only Booked/date/start/end; no candidate, booking ID, money or payment reference. Cancelled INT-YN6ZA1 excluded; active INT-0JGTRT shown. | live-public-populated-india; live-public-new-york-actual |
| PUBLIC-02 | Not run (partial) | Empty dates were covered by prior historical live report. Impossible-date/invalid-zone variants not repeated in this follow-up. | Browser observation log |
| PUBLIC-04 | Pass | Same active slot: New York 12:00–12:30; Kolkata/Calcutta 21:30–22:00; UTC 16:00–16:30 on 16-10-26. | live-public-populated-india; live-public-new-york-actual; live-public-UTC |
| PUBLIC-06 | Not run (partial) | Clicked End and re-requested the public results. Only one active row available, so multi-row order/all columns not proved. Browser reload is not the required in-memory result refresh. | live-public-sort-result-refresh |
| PUBLIC-07 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| PUBLIC-08 | Blocked | No future DST-transition booking created. Ordinary October conversion is not DST gap/overlap proof. | Browser observation log |
| CAND-01 | Not run (partial) | Compact profile and aligned Date/Start/End present; pending, verified, cancelled and refunded rows observed. Long-name/all-status combinations not covered. | live-candidate-reload-two-bookings |
| CAND-02 | Blocked | A second candidate with a separate QA booking/session was not established. Public privacy check does not prove cross-candidate isolation. | Browser observation log |
| CAND-03 | Pass | Profile initially locked; NY draft Cancel restored Asia/Calcutta; Edit/Save NY persisted. Restored Asia/Calcutta before final handoff. | live-timezone-cancel; live-profile-NY-saved; live-candidate-refunded |
| CAND-05 | Pass | New York same-day End showed time only. The 14:00–14:30 NY slot displayed India 23:30–00:00 with Next day · 17-10-26. 12/24 table switch worked. | live-candidate-overnight-india; live-overnight-24h |
| CAND-06 | Blocked | Current deployment response tested; older human-readable endpoint variant not available through actual UI. | Browser observation log |
| CAND-07 | Not run (partial) | All/pending/verified/refunded isolated the correct QA rows. No-payment filter showed friendly empty result. Refund-requested and every populated extra state were not separately checked. | live-candidate-pending-filter; live-candidate-verified-filter; live-candidate-refunded-filter; live-empty-extra-filter-actual |
| CAND-08 | Blocked | No actual timezone-midnight, leap-day or year-boundary records/waits; ordinary 16-10-26 display does not prove these cases. | Browser observation log |
| CAND-09 | Not run (partial) | Missing From rejected; From16-10-26/To11-10-26 rejected with End date cannot be before start. Inclusive/same-day valid range not covered. | live-range-missing-date; live-range-reversed |
| CAND-10 | Not run (partial) | Start toggled two QA rows between noon then14:00 and reverse. Every column and combined valid date/status intersection not exercised. | live-two-bookings-start-order1; live-two-bookings-start-order2 |
| CAND-11 | Pass | Initially empty QA dashboard offered Book Interview, which opened the form. No-payment filter offered Clear filters; clicking restored both QA rows and All dates/All state. | live-blank-quote; live-empty-extra-filter-actual; live-two-bookings-start-order1 |
| CAND-12 | Blocked (partial) | Future confirmed booking exposed Cancel; cancelled QA rows had no Cancel. Past/just-expired transitions not present. | live-candidate-cancel-refund-request |
| BOOK-01 | Pass | 16-10-26 NY12:00–12:30 Technical quote available:30min/$50. 12:00–12:40=$70;12:00–13:30=$120 matched saved threshold30/prices50/70. | live-NY-oct16-noon-quote; live-price-40; live-price-90 |
| BOOK-02 | Not run (partial) | Blank quote rejected. Other malformed/equal/reversed/past variants not repeated in this follow-up; prior report records reversed rejection. | live-blank-quote |
| BOOK-04 | Not run (partial) | Changing quoted End12:30→12:40 removed Available/Pay & Confirm; new quote required. Every other input variant not checked. | live-quote-invalidated-end-change |
| BOOK-07 | Pass | Candidate submitted QA-LIVE-20261011-002 and amount50 for NY16Oct12:00–12:30. Created one INT-0JGTRT and linked PAY-IU28R9 SUBMITTED; refreshed candidate/admin rows matched. | live-candidate-reload-two-bookings; live-second-payment-verified; live-admin-second-linked-booking |
| BOOK-08 | Not run (partial) | Missing UTR rejected in in-page Notice; UTR QA-LIVE-INVALID-ZERO-20261011 with amount0 rejected Enter amount paid. Negative/nonfinite/duplicate-reference variants not checked. | live-empty-reference-notice; live-zero-payment-rejected |
| BOOK-10 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| BOOK-11 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| BOOK-13 | Not run (partial) | Admin-created NY14:00–14:30 interval crossed India midnight accurately. Candidate-created noon slot also converted correctly; candidate-created cross-midnight-in-admin variant not performed. | live-candidate-overnight-india |
| BOOK-14 | Not run (partial) | Saved placeholder CHANGE_ME@upi hidden; payment dialog said Contact Admin. Valid image/Drive/folder/unsafe-link variants not changed on shared live settings. | live-payment-modal-no-submit |
| TIME-01 | Fail | 24-hour switch updated candidate inputs to12:00/12:30 and tables/availability, but available quote summary retained Oct16,2026,12:00 PM EDT–12:30 PM EDT. | L-02; live-quote-format24-reproduced; qa-live-20261011-quote-format24.png |
| TIME-02 | Not run (partial) | Observed midnight00:00/12:00AM and noon12:00PM correctly.13:05/23:59 not exercised. | live-overnight-24h; live-NY-oct16-noon-quote |
| TIME-03 | Blocked (partial) | Header and reload observed for one QA candidate/admin; separate A/B candidate preference scenario not created. | Browser observation log |
| TIME-07 | Not run (partial) | General zone NY→Kolkata while availability stayed NY12–20 and Create Booking read-only zone stayed NY; candidate profile NY/India worked. Differing-zone table/export data comparison not performed. | live-independent-schedule-zone; live-create-independent-zone; live-settings-restored-verified |
| TIME-08 | Blocked | No actual timezone-midnight, leap-day or year-boundary records/waits; ordinary 16-10-26 display does not prove these cases. | Browser observation log |
| TIME-09 | Fail | 24-hour switch updated candidate inputs to12:00/12:30 and tables/availability, but available quote summary retained Oct16,2026,12:00 PM EDT–12:30 PM EDT. | L-02; live-quote-format24-reproduced; qa-live-20261011-quote-format24.png |
| ADMIN-01 | Pass | Live admin login/dashboard/refresh loaded global counts, settings and rows; no M_ID popup or stuck loader observed after completion. Small tables used page1 of1. | live-admin-authenticated; live-admin-refresh |
| ADMIN-02 | Not run | Counts changed to2candidates/1upcoming then0 as QA bookings changed, but all metric-card navigation variants were not clicked. | Browser observation log |
| ADMIN-03 | Blocked (partial) | Zero-work attention box displayed Everything is up to date. Failed/unsupported work projections unavailable; no fake failure injected. | live-admin-dashboard-after-refund |
| ADMIN-04 | Blocked (partial) | Two candidates sorted Name ascending and descending correctly. Other tables had0/1rows at initial checks; all-column/equal-values/paging scenario not covered. | live-candidates-both-name-order1; live-candidates-both-name-order2 |
| ADMIN-05 | Blocked (partial) | Candidate ID AV-0ZGAG and multiword QA Browser searches returned own row. Only2candidates/2bookings exist; >50/100 rows and beyond-page search/export unavailable. | live-candidates-search |
| ADMIN-07 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| ADMIN-08 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| ADMIN-09 | Blocked (partial) | Candidate ID AV-0ZGAG and multiword QA Browser searches returned own row. Only2candidates/2bookings exist; >50/100 rows and beyond-page search/export unavailable. | live-candidates-search |
| ADMIN-11 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| ADMIN-12 | Not run (partial) | Candidate contact Save persisted; payment Change draft Cancel stayed closed after navigating Candidates→Payments. Booking editor Cancel/refresh variants not fully repeated. | live-contact-valid-save; live-cancel-discarded-confirmed |
| ADMIN-13 | Not run (partial) | Candidates contacts visible in inputs; Bookings wide table had a separate scroll region and cancelled row No actions. Long reference/all-state layout not covered. | live-admin-second-linked-booking |
| ADMIN-15 | Blocked | No naturally occurring read/save/export network failure or session expiry occurred; did not inject responses or manufacture errors. | Browser observation log |
| ADMIN-16 | Not run (partial) | Search, tab navigation, refresh and timezone Save completed without M_ID. Out-of-order delayed responses were not deliberately controlled. | live-admin-refresh; live-settings-restored-verified |
| CONTACT-01 | Not run | Registration was exercised; separate admin candidate creation for regular/percentage was not. | Browser observation log |
| CONTACT-02 | Not run (partial) | Invalid email bad-address with corrected phone rejected without partial save. Valid original email/+919999999911 saved and persisted; unchanged Save worked. Type/percentage and every invalid field boundary not exercised. | live-candidate-invalid-email; live-contact-valid-save; live-contact-unchanged-resave |
| CONTACT-03 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| CONTACT-07 | Blocked | No visible deactivation control exercised; no direct API call used. | Browser observation log |
| CREATE-01 | Pass | With general zone Kolkata and saved schedule NY, Create Booking displayed read-only America/New_York. Candidate picker included available QA account; inactive record unavailable for exclusion variant. | live-create-independent-zone; qa-live-20261011-independent-zone.png |
| CREATE-02 | Blocked | No future winter interval entered/submitted; October EDT conversion is not winter EST proof. | Browser observation log |
| CREATE-03 | Not run (partial) | Admin-created NY14:00–14:30 appeared India23:30→next-day00:00. Differing-general-zone source payload submission variant not exercised. | live-candidate-overnight-india |
| CREATE-04 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| CREATE-06 | Blocked | A second simultaneous authenticated browser session was not established; no simulated concurrency or storage manipulation used. | Browser observation log |
| CREATE-07 | Not run (partial) | Retry of already accepted16Oct14:00–14:30 was rejected for overlap/buffer; only one booking existed. Override-on/outside-hours/block variants not tested. | live-admin-booking-actual-created |
| CREATE-09 | Not run (partial) | Negative charge-1 rejected; blank override used calculated$50 and created INT-YN6ZA1. Explicit zero/percentage/admin-override variants not tested. | live-admin-negative-charge; live-admin-QA-booking-created |
| CORRECT-01 | Not run (partial) | Admin changed QA booking Paid from0 to50; linked PAY-8PJ8DT created with expected/submitted50. Charge/reference/remark and pending-refund amount synchronization not fully checked. | live-QA-booking-paid-edit; live-linked-payment-created |
| CORRECT-03 | Not run (partial) | Cancelled row showed No actions; completed-refund payment transition FAILED rejected. Duplicate reference/completed-refund amount writes not exercised. | live-admin-second-linked-booking; live-completed-refund-payment-protection |
| MONEY-01 | Pass | PAY-8PJ8DT changed SUBMITTED→FAILED→VERIFIED; PAY-IU28R9 separately verified from SUBMITTED. Booking and candidate statuses agreed on revisit. | live-QA-payment-failed; live-payment-corrected-verified; live-second-payment-verified |
| MONEY-02 | Pass | Change on Failed and Verified selected saved value; Save/Cancel displayed; no reason field/Update payment status label. Picker accessible name defect tracked separately. | live-QA-payment-failed; live-cancel-discarded-confirmed; L-03 |
| MONEY-03 | Pass | Verified payment Change→pending draft→Cancel; navigate away/back. Editor remained closed and status Verified; no abandoned draft reopened. No second page exists. | live-payment-cancel-draft-changed; live-cancel-discarded-confirmed; qa-live-20261011-payment-cancel.png |
| MONEY-04 | Not run (partial) | FAILED→VERIFIED succeeded and matched candidate/admin; attempt to fail refunded payment rejected safely. Saving every permitted transition not completed. | live-payment-corrected-verified; live-completed-refund-payment-protection |
| CANCEL-01 | Pass | Dismissed first cancellation confirmation: booking stayed Confirmed. Confirmed later: Cancelled/Refund requested; no Cancel action remained. External cleanup itself not inspected. | live-cancel-dismissed; live-candidate-cancel-refund-request |
| CANCEL-04 | Not run (partial) | Verified QA cancellation generated requested refund50. SUBMITTED/no-payment variants not exercised. | live-candidate-cancel-refund-request |
| REFUND-01 | Pass | REF-K3GUZ5 completed with QA-LIVE-REFUND-20261011. Refund list and subsequent candidate view both showed Refunded; attempted FAILED payment afterwards rejected. | live-admin-refund-completed; live-candidate-refunded; live-completed-refund-payment-protection |
| REFUND-04 | Blocked | No naturally occurring read/save/export network failure or session expiry occurred; did not inject responses or manufacture errors. | Browser observation log |
| AV-01 | Pass | Rules/zone initially locked; Edit beside Add Rule unlocked; Cancel restored sevenSun–Sat12–20 rules and NY zone, relocking inputs. | live-availability-locked; live-availability-edit; live-availability-24h |
| AV-02 | Not run (partial) | Saved existing seven weekly12–20 rules unchanged with NY zone while general zone Kolkata. Save succeeded and reopened unchanged. Deliberately changed weekly hours not tested. | live-availability-save-current-backend |
| AV-03 | Pass | General Settings zone saved Kolkata; Availability stayed NY12–20; Create Booking stayed NY. General zone restored NY afterwards. | live-general-zone-kolkata; live-independent-schedule-zone; live-create-independent-zone; live-settings-restored-verified |
| AV-04 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| AV-06 | Not run (partial) | Add Rule inserted a BLOCK draft with date/start/end; Cancel removed it and restored seven weekly rules. Rule-type switching/remove/saved-rule behavior not fully exercised. | live-add-rule-draft; live-add-rule-cancelled |
| AV-08 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| AV-14 | Pass | Save Availability completed against live backend, reopened rules/zone correct, no older-server warning. | live-availability-save-current-backend |
| SET-01 | Not run (partial) | NY→Kolkata draft Cancel restored NY. Then saved Kolkata and later restored NY; buffers30/30, UPIplaceholder, QRblank, threshold30, prices50/70 and calendar unchanged. Other field Save variants not checked. | live-settings-cancel-restored; live-general-zone-kolkata; live-settings-restored-verified |
| WORK-03 | Blocked | Attention box reported0failed updates. No visible QA job/batch/malformed work entry; no fake failure injected. | live-admin-dashboard-after-refund |
| WORK-04 | Blocked | Attention box reported0failed updates. No visible QA job/batch/malformed work entry; no fake failure injected. | live-admin-dashboard-after-refund |
| WORK-07 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| XLSX-01 | Blocked (partial) | Actual .xlsx downloads completed for all five views: filtered Candidates1row; Bookings/Payments/Refunds1row; Dashboard0rows. ZIP packages had6entries with worksheet XML. No Excel/LibreOffice viewer available, so rendered content/format comparison not passed. | local-preview/qa-live-downloads/; download completion events |
| XLSX-02 | Blocked (partial) | Candidate ID AV-0ZGAG and multiword QA Browser searches returned own row. Only2candidates/2bookings exist; >50/100 rows and beyond-page search/export unavailable. | live-candidates-search |
| XLSX-03 | Blocked (partial) | Actual .xlsx downloads completed for all five views: filtered Candidates1row; Bookings/Payments/Refunds1row; Dashboard0rows. ZIP packages had6entries with worksheet XML. No Excel/LibreOffice viewer available, so rendered content/format comparison not passed. | local-preview/qa-live-downloads/; download completion events |
| XLSX-04 | Blocked (partial) | Filtered candidate download completed. No available spreadsheet viewer; differing-zone/format export comparison and multi-page content not performed. | local-preview/qa-live-downloads/ |
| XLSX-10 | Blocked | No naturally occurring read/save/export network failure or session expiry occurred; did not inject responses or manufacture errors. | Browser observation log |
| UI-01 | Not run (partial) | Observed in-page UTR Notice, cancellation confirmation, refund-reference prompt, inline errors and toasts. Every possible dialog in both roles/native-event monitoring not exhaustive. | live-empty-reference-notice; live-refund-prompt-dismissed |
| UI-02 | Not run (partial) | Cancel dismissed payment/cancellation/refund dialogs; next dialog opened and controls remained usable. Escape/focus restoration not exhaustively checked. | live-refund-prompt-dismissed; live-cancel-dismissed |
| UI-03 | Not run (partial) | Profile, contact, payment, Settings and Availability showed in-page success feedback; full accessibility/dismissal timing checks not performed. | live-settings-restored-verified; live-contact-valid-save |
| UI-04 | Not run (partial) | October date picker selected16 correctly. Month/year navigation, Today/Clear and leap-date variants not fully exercised. | live-NY-oct16-noon-quote |
| UI-05 | Not run (partial) | 12hour picker selectednoon/30minute/PM; Apply populated correct values. Header24 changed triggers; quoted End edit invalidated quote. Full24 picker/disabled-input checks not performed. | live-quote-invalidated-end-change; live-availability-24h |
| UI-06 | Fail | Timezone/search selection worked; payment-status picker labeled Interview type in its aria label/dialog. Candidate account-type picker also exposed Interview type. | L-03; qa-live-20261011-payment-label.png |
| UI-07 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| UI-09 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| UI-10 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| UI-12 | Not run (partial) | Real admin refresh, navigation and timezone Edit/Cancel/Save succeeded; no M_ID popup observed. Per-connection exception capture reported0; not continuous exhaustive console monitoring. | live-admin-refresh; live-settings-restored-verified |
| FLOW-01 | Pass | Registered QA, logged in, quoted NY16Oct12:00–12:30, submitted QAreference/50, reloaded and compared linked admin payment/booking. | live-candidate-reload-two-bookings; live-admin-second-linked-booking |
| FLOW-02 | Pass | Admin verified PAY-IU28R9, candidate saw Verified and cancelled INT-0JGTRT; admin completed QA refund; refreshed candidate agreed. First QA refund also protected against payment regression. | live-second-payment-verified; live-second-candidate-cancelled; live-second-refund-completed; live-final-candidate-state |
| FLOW-03 | Not run | This complete case was not exercised in this live run; no passing result is inferred. | — |
| FLOW-04 | Not run (partial) | Saved existing scheduleNY unchanged; generalNY→Kolkata kept Create BookingNY; restored generalNY. Differing-zone booking submission/pricing/buffer mutations not performed. | live-availability-save-current-backend; live-settings-restored-verified |
| FLOW-05 | Blocked (partial) | Filtered candidate download completed. No available spreadsheet viewer; differing-zone/format export comparison and multi-page content not performed. | local-preview/qa-live-downloads/ |
| FLOW-06 | Blocked (partial) | QA candidate changed password: signed out with inline success, old login rejected, new login succeeded. Restored original QA password and confirmed final login. Recovery/pending-code invalidation not checked; successful shared-admin credential changes not authorized. | live-QA-password-changed; live-old-QA-password-rejected; live-new-QA-password-login; live-QA-password-restored; live-final-candidate-state |
| MANUAL-01 | Pass | Same QA account opened by email and ID. Candidate Change Password rejected mismatch and wrong current password; valid change returned to login, old password rejected, new password worked. Restored original QA password and verified it worked. | live-candidate-email-login; live-password-wrong-current; live-QA-password-changed; live-old-QA-password-rejected; live-new-QA-password-login; live-final-candidate-state |
| MANUAL-02 | Blocked | Did not create lockout or wait15minutes; no lockout/timed-recovery result claimed. | Browser observation log |
| MANUAL-03 | Blocked | Live website does not expose mock recovery codes; access to QA email inbox unavailable. No reset mail was requested and no expiry/throttle result is claimed. | Browser observation log |
| MANUAL-04 | Blocked | Live website does not expose mock recovery codes; access to QA email inbox unavailable. No reset mail was requested and no expiry/throttle result is claimed. | Browser observation log |
| MANUAL-05 | Blocked (partial) | Admin Forgot password form opened; malformed email not-an-email rejected. Shared admin password reset/change was not authorized; no reset email sent. | live-admin-recovery-invalid-email |
| MANUAL-06 | Pass | Same QA account opened by email and ID. Candidate Change Password rejected mismatch and wrong current password; valid change returned to login, old password rejected, new password worked. Restored original QA password and verified it worked. | live-candidate-email-login; live-password-wrong-current; live-QA-password-changed; live-old-QA-password-rejected; live-new-QA-password-login; live-final-candidate-state |
| MANUAL-07 | Blocked | A second candidate with a separate QA booking/session was not established. Public privacy check does not prove cross-candidate isolation. | Browser observation log |
| MANUAL-08 | Not run (partial) | Invalid email bad-address with corrected phone rejected without partial save. Valid original email/+919999999911 saved and persisted; unchanged Save worked. Type/percentage and every invalid field boundary not exercised. | live-candidate-invalid-email; live-contact-valid-save; live-contact-unchanged-resave |
| MANUAL-09 | Not run (partial) | Negative charge-1 rejected; blank override used calculated$50 and created INT-YN6ZA1. Explicit zero/percentage/admin-override variants not tested. | live-admin-negative-charge; live-admin-QA-booking-created |
| MANUAL-10 | Blocked (partial) | Filtered candidate download completed. No available spreadsheet viewer; differing-zone/format export comparison and multi-page content not performed. | local-preview/qa-live-downloads/ |
| MANUAL-11 | Not run (partial) | Saved existing scheduleNY unchanged; generalNY→Kolkata kept Create BookingNY; restored generalNY. Differing-zone booking submission/pricing/buffer mutations not performed. | live-availability-save-current-backend; live-settings-restored-verified |
| MANUAL-12 | Blocked | Attention box reported0failed updates. No visible QA job/batch/malformed work entry; no fake failure injected. | live-admin-dashboard-after-refund |
| MANUAL-13 | Not run (partial) | Search, tab navigation, refresh and timezone Save completed without M_ID. Out-of-order delayed responses were not deliberately controlled. | live-admin-refresh; live-settings-restored-verified |
| MANUAL-14 | Not run (partial) | Payment Change altered selection then Cancel stayed closed after navigation; refund prompt dismissed without write. Booking-edit Cancel not exercised. | live-cancel-discarded-confirmed; live-refund-prompt-dismissed |

Conclusion: core observed booking/payment/refund and independent schedule-zone behavior worked. Fix the phone validation and two labeling/format defects. The incomplete/blocked inventory prevents a blanket ready-for-production conclusion.

---



## Current deployed Apps Script walkthrough — version 18

Run date: 2026-10-11 (local session time, UTC+05:30)
Target: [New public Web app deployment, version 18](https://script.google.com/macros/s/AKfycbxZIpx_VhaMuRtATw1D14Bl6xjxQSL8eVbO_0RJV-7WLp0izAsrTi1tyswDgbZPHz2c/exec). The old deployment URL now returns a Google 404 because its deployment entry was changed to a Library during the CLI update.
Access: Execute as the project owner; Anyone can access.
Environment: Live Apps Script page in the integrated browser.
Data safety: One clearly labeled QA candidate was registered, and its candidate timezone was temporarily changed and restored. No booking, payment, refund, shared-setting, availability, Calendar, or Contacts mutation was performed. Candidate `AV-NP1P2` remains in the live Candidates sheet with the submitted phone value `123`; it was created unintentionally during phone-validation testing and was not deleted.

| Check | Result | Observation |
| --- | --- | --- |
| Landing page and client startup | Pass | Styled welcome page rendered, client helpers initialized, and no client-script syntax error was observed. |
| Landing navigation | Pass | Candidate Login, Register, Admin, and Back controls opened/returned to their forms. |
| Public blocked schedules | Pass (empty data) | 11-10-2026 queried in Asia/Calcutta and America/New York; both returned “No bookings on this date.” The date/timezone controls and backend request path work. No populated schedule was available to verify privacy or conversion of actual occupied intervals. Public timezone was restored to Asia/Calcutta. |
| Blank registration | Pass | Empty submission was rejected with a required-fields message; no candidate was created by that attempt. |
| Invalid email registration | Pass | `bad-address` was rejected with “A name and valid email are required.” |
| Registration password mismatch | Pass | Different confirmation was rejected with “Passwords do not match.” |
| Registration short password | Pass | Matching 6-character password was rejected; UI requires 8–1024 characters. Password maximum boundaries were not tested. |
| Invalid phone registration | **Fail** | Phone `123` with India country code was accepted and account creation completed, generating `AV-NP1P2`. This is a live input-validation defect; the record remains for an administrator to review/remove. |
| QA candidate registration | Pass with defect above | Candidate `AV-NP1P2` (`QA Live Test 20261011`, `qa.live.20261011@example.com`) registered as REGULAR in Asia/Calcutta. Do not use this record as evidence that phone validation is correct. |
| Duplicate candidate email | Pass | A second registration using the QA email was rejected: “A candidate account already exists for this email. Please use Candidate Login.” |
| Candidate login | Pass (email and ID); wrong-password check Pass | Wrong password was rejected with a generic invalid-credentials message. Login by the QA email and then by candidate ID `AV-NP1P2` both opened the matching candidate dashboard. |
| Candidate session refresh | Pass | Refresh restored the authenticated QA dashboard and profile from the valid session. |
| Candidate logout | Pass | Logout returned to the public welcome page; reload remained signed out. |
| Empty candidate dashboard filters | Pass (empty data only) | Payment pending filter selected and dashboard remained usable with the expected empty-state message. There were no bookings to verify row-level filtering/sorting. |
| Candidate timezone edit | Pass | Changed the QA profile from Asia/Calcutta to America/New_York, verified the dashboard update, then restored Asia/Calcutta through Edit/Save. A new page restored the session with the original timezone. |
| 12/24-hour display preference | Pass | Candidate booking-time controls changed from 1:00 PM/1:30 PM to 13:00/13:30 and back to 12-hour display. Preference was restored to 12 hours. |
| Candidate booking form validation | Pass | Blank quote request was rejected. End-before-start (1:00 PM–12:00 PM, same day) showed “End time must be later than start time” without creating a booking. |
| Availability quote | Blocked by current configuration | Initial 15-10-2026 requests for 12:00–12:30 PM and 1:00–1:30 PM Asia/Calcutta returned “Requested interview is outside Admin availability.” Follow-up visible-UI checks tried 9:00–10:00 AM, 1:00–2:00 PM, and 5:00–6:00 PM on each of 12–15 October 2026; all 12 returned the same message. Admin availability was not inspected or changed, so a successful quote could not be established. No booking was submitted. |
| Candidate password change | Pass (negative checks) | Mismatched new passwords were rejected inline; matching new passwords with an incorrect current password were rejected with “Current password is incorrect.” No password was changed. |
| Admin login/recovery | Partial | Admin login form rendered; blank credentials returned “Invalid admin credentials.” Blank admin recovery email was rejected with “Enter your admin email.” No admin credentials were entered and no recovery email was sent. |
| Admin, booking, payment/refund, Calendar/Contacts workflows | Not run | No known admin credentials; no successful booking quote; and real external/payment mutations were intentionally avoided. |

Follow-up run date: 2026-10-11. The additional quote checks used the visible date and custom 12-hour time pickers, then the “Check availability & price” button; no direct RPC calls or browser-storage edits were used. All 12 requests were rejected as outside Admin availability. The picker exposes hours 1–12 with AM/PM, so tests used those controls rather than 24-hour hour values. Admin-side workflows remain blocked pending an authorized admin session; payment/refund and Calendar/Contacts work also remain untested. Shared availability was not changed and no booking was created.

All interactions above were performed through visible deployed-app controls; no direct RPC calls or browser-storage edits were used. The Apps Script source workaround replaces the malformed escaped-slash regex with protocol substring checks. All 14 local test files passed before deployment. The original root cause of the version-16 deployed/source mismatch is still unconfirmed. The previous deployment URL is no longer usable; use the new version-18 deployment URL. Admin and external-service flows remain unverified.

## Deployed Apps Script smoke test

Run date: 2026-10-11 (local session time, UTC+05:30)
Target: Prior Apps Script deployment, version 16 (its deployment entry was later replaced; see current version-18 result above).
Environment: Live deployed page in the integrated browser. This verifies only the deployed UI shell and attempted visible controls; no Apps Script backend operation completed.
Data safety: No registration, login, booking, payment, refund, shared-setting, or availability mutation was completed. No spreadsheet or external Google service data was changed.

### Result

| Check | Result | Observation |
| --- | --- | --- |
| Deployment page load | Pass (limited) | The styled Interview Booking Portal welcome page, Candidate Login, Register, Admin, and public Blocked schedules controls rendered. |
| Register navigation | Fail | Clicking Register raised `ReferenceError: show is not defined`; the registration form did not open. |
| Candidate Login navigation | Fail | Clicking Candidate Login did not navigate to the login form. |
| Admin navigation | Fail | Clicking Admin raised `ReferenceError: show is not defined`; the admin login form did not open. |
| Public blocked-schedule lookup | Fail | Clicking Check blocked schedules raised `ReferenceError: loadPublicBookings is not defined`; no lookup completed. |
| Client script initialization | Fail — blocking | The inline client script as served by the deployment fails a syntax check with `SyntaxError: Invalid regular expression: missing /`. The affected text is the extension-error regex near `isExtensionError`; client helpers such as `show`, `el`, and `call` are unavailable. |
| Backend and authenticated workflows | Blocked | Navigation fails before forms or server calls are usable. Registration/login, booking, payment/refund, admin pages, and Google service workflows were not tested. |

The local `Index.html` script passed a JavaScript syntax check, while the script extracted from the version-16 deployment was malformed near the extension-error regex. The cause of that source/deployment mismatch is not confirmed. This historical version-16 failure was addressed in source and superseded by the version-18 deployed smoke test at the top of this report.

## Earlier local preview walkthrough report

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
