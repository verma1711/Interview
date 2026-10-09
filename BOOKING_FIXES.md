Booking reliability changes — local tests passed
========================================================

This remains a Google Sheets-bound Apps Script application. The Node preview
only supplies local mocks; it is not the production server. No layout, CSS,
navigation or form controls were changed.

Include all numbered server files, including 06_BookingIntegrity.js and 07_AdminData.js, when
updating Apps Script. These changes use the existing sheet columns and require
no data reset. Existing IDs and references remain valid. New booking/payment/
refund/rule IDs use a six-character suffix (INT-A3K9P2); new candidate IDs use
a five-character suffix (AV-A3K9P). Session tokens remain full-length secrets.

Changes
-------

- Payment inputs are read before the modal closes. Quotes are invalidated when
  the form or candidate timezone changes, and submission checks the quoted
  time, price and payment requirement against current server values.
- Booking, settings, availability, payment and cancellation mutations share
  the Apps Script lock. UTR uniqueness is checked inside that lock.
- Past bookings and invalid monetary/settings values are rejected. Full-day
  blocks no longer spill into the following day. Candidate booked-time lists
  use actual local calendar dates instead of a fixed 27-hour interval.
- Availability rules are validated before replacing the range in one write.
- Admin login locks for 15 minutes after five failed password attempts.
- Both cancellation paths create at most one refund request. A submitted
  payment can be reviewed, but it must be VERIFIED before a refund is marked
  REFUNDED. Failed payments reject pending refund requests.
- Sheet edits preserve unrelated cells/formulas and store leading '=' input
  as literal text.
- External Calendar/email failures leave the saved booking intact and record
  pending work in Script Properties and an error in Audit Log. Credentials are
  excluded from pending payloads. New Calendar references include the calendar
  ID so changing the configured name does not strand those events.

Recovery
--------

After correcting a Calendar permission or mail/quota problem, run
retryPendingBookingWork() from the Apps Script editor as the owner. It retries
pending work under the same lock. Calendar retries look for the booking marker
before creating an event. Email delivery is at least once: if a send succeeds
but a later operation fails, a retry may repeat a notification. Google Sheets,
Calendar and Mail do not form a single database transaction.

Old Calendar references contain only an event ID and still use the configured
calendar name. Keep the original calendar setting until old bookings have
finished, or migrate those references separately.

Validation status
-----------------

Local validation completed on 2026-09-27. All six automated test files passed
together on the final run, including after the browser-discovered timezone fix.
The availability fixture now returns numeric setting defaults, and the overlap
regression uses a distinct payment reference so it reaches the conflict check.
The browser test fixtures were also repaired. To rerun the suite:

    node --test tests/*.test.cjs

A separate HTTP smoke check against the local preview passed page serving,
session isolation, candidate/admin login, quote, booking, payment verification,
cancellation, refund, logout, past-date rejection and cross-origin rejection.
Automated browser-function tests cover payment input capture and session
restoration.

A real Edge browser walkthrough also passed:
- Registration, mismatched-password validation, recovery and new-password login.
- Regular booking with UTR, percentage booking, candidate cancellation, stale
  quote invalidation, refresh/session restoration and logout.
- All admin pages, payment verification, admin cancellation, refund completion,
  booking creation and amount edits, search, settings validation/save and
  availability save.
- Public booked times and loading the configured QR image.
- Desktop screenshots and 390px mobile candidate/admin layouts with no page
  horizontal overflow. No uncaught JavaScript exceptions were observed.

The walkthrough found that Edge reports Asia/Calcutta, leaving the original
fixed registration timezone list unselected. The dropdown now includes the
detected timezone; candidate profiles also retain any valid timezone outside
the preset list. Layout and styling were not changed. This was rechecked in
the browser. Screenshots are stored under local-preview/browser-*.png.
The .claspignore file excludes local-preview and tests from deployment.

Live Apps Script checks remain pending: real Sheets/Calendar/email permissions,
delivery, quotas, execution time and concurrent requests. Local lock assertions
verify that mutations acquire the lock, not real Apps Script concurrency.

API references used for the implementation:
- https://developers.google.com/apps-script/reference/calendar/calendar
- https://developers.google.com/apps-script/reference/calendar/calendar-event
- https://developers.google.com/apps-script/reference/spreadsheet/range

Current admin improvements (2026-10-10)
---------------------------------------
Admin booking amount/reference corrections synchronize payment records and
incomplete refunds. Payment status changes remain admin-only and audit the
previous/new state and correction reason. Failed external jobs store attempt/error
details and appear in the dashboard with admin Retry controls; owner editor retries
remain available. See PROJECT_GUIDE.md for current paging/deployment
and validation details.
