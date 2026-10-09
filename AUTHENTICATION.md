Candidate authentication upgrade
===============================

The review covered all server files, Index.html, the manifest, setup, legacy
import, candidate/admin creation and updates, booking, availability/timezones,
payments/refunds, Calendar and People contacts. Authentication data now lives in
the Google Sheet. Script Properties store the salted admin credential, a
server-only recovery HMAC key, and old candidate hashes pending migration.

Deployment
----------

1. Upload the server files (including `05_AuthSecurity.js`, `06_BookingIntegrity.js` and `07_AdminData.js`), Index.html and the
   manifest to the existing Apps Script project.
2. As the script owner, run `upgradeCandidateAuthentication()` from the editor.
   It appends missing authentication columns to Candidates and creates
   AuthSessions, preserving existing rows, column order, custom columns and
   business settings. The added userinfo.email scope supports owner checks;
   authorize it when prompted.
3. Update the web-app deployment. Existing cache-only sessions require one new
   login. Existing candidate passwords migrate from Script Properties to Sheets
   after a successful password login. Accounts created by Admin or legacy import
   without a password use Forgot Password to establish one.
4. Smoke-test registration, login by ID and email, refresh, logout, reset emails,
   password reset, booking, payment verification, cancellation/refund, Calendar
   events and People contacts in the deployed environment. Confirm password
   hashing latency is acceptable on Apps Script; local mocks cannot measure it.

For a new installation, set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in
Script Properties, run `runInitialSetup()` in the editor, then remove those two
initialization properties. The hard-coded admin credential was removed. Existing
admin passwords and Settings values are preserved when setup is rerun.

Fresh start for testing
-----------------------

Run `resetInterviewPortalForTesting()` manually from the Apps Script editor as
the owner. This permanently deletes all eight portal tabs: Candidates,
AuthSessions, InterviewsV3, Payments, Refunds, Settings, Availability and Audit
Log, including their data and custom columns. It also removes the stored admin
password hash, recovery secret and legacy candidate password hashes. Existing
sessions become invalid.

Other tabs, unrelated Script Properties, Google Calendar events and Google
Contacts are preserved. If every tab belongs to the portal, the function leaves
a blank `Portal Reset` tab because Google Sheets requires at least one tab.
The public editor wrapper delegates to the private implementation and retains
the same active/effective Google user check as setup. No reset control is exposed
in the portal UI; the public function still enforces that check on RPC calls.

After resetting, set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in Script
Properties if needed, then run `runInitialSetup()` to recreate all portal tabs.
Remove those initialization properties afterward and refresh the portal to
register new test candidates. Reset preserves those two properties when present.
Old Calendar events and Contacts remain even though their sheet records are gone.

Storage and behavior
--------------------

- Candidates adds PasswordSalt, PasswordHash, PasswordAlgorithm,
  PasswordIterations, AuthVersion, ResetHash, ResetExpiresUTC, ResetAttempts,
  ResetSentAtUTC, LoginAttempts and LoginLockedUntilUTC. All creation paths
  initialize these fields; profiles and admin views explicitly omit them.
- Passwords use a unique salt and PBKDF2-HMAC-SHA256 with 600,000 iterations.
  This work factor follows the OWASP Password Storage Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
  Google's native HMAC computes the first PBKDF2 round; fixed-size SHA-256
  compression runs remaining rounds locally to avoid repeated service calls.
- AuthSessions stores only token hashes, role, candidate ID, email, credential
  version and expiry. Browser localStorage keeps the bearer token. Sessions last
  six hours, survive refresh/cache eviction, and expire server-side. Password
  reset/change and account deactivation invalidate previous candidate sessions.
  AuthSessions is internal and excluded from legacy interview migration.
- OTP is only for password recovery. Codes expire after ten minutes, allow five
  guesses, are single-use, and can be resent after one minute. Recovery hashes
  use a server-only HMAC key. Five failed password logins lock an account for
  fifteen minutes. Successful recovery clears the login lock.
- Setup/import entry points require matching active and effective Google users;
  anonymous candidate requests cannot invoke these maintenance operations.
- Admin passwords now use the same salted PBKDF2 scheme in the
  ADMIN_PASSWORD_CREDENTIAL Script Property. Existing ADMIN_PASSWORD_HASH
  values migrate after a correct login without changing the password. New setup
  uses PBKDF2 directly; failed logins do not migrate credentials.
- Expired/revoked sessions are compacted at most daily on session creation;
  active sessions and custom columns remain intact.

Verification
------------

Run `node tests/auth.test.cjs`. It checks fresh/existing setup, all candidate
property reads against setup columns, rejects unknown sheet writes, verifies
PBKDF2 against Node crypto, tests authentication/recovery/session edge cases,
executes browser session restoration, validates client RPC names, and exercises
booking/payment/refund/admin/calendar/contact paths using mocked Google APIs.
No live Sheet or deployment was modified by these tests.

## Admin email recovery

Admin sign-in now offers Forgot password. requestAdminPasswordReset(email) sends a six-digit code to the configured ADMIN_EMAIL (not ADMIN_NOTIFICATION_EMAIL). Unknown addresses receive a generic success response without email delivery. ADMIN_PASSWORD_RESET contains the email, HMAC code digest, expiry, attempts and resend timestamp; plaintext codes never appear in production responses. Codes expire after ten minutes, allow five failed guesses, and requests are limited to once per minute. Delivery failure clears pending state so retry is possible.

resetAdminPassword(email,code,newPassword) validates the code under the authentication lock, applies the existing password policy and PBKDF2 storage, clears admin login locks, and revokes admin sessions. Candidate sessions are preserved. A successful reset is single-use; signed-in admin password changes invalidate outstanding recovery codes. Owner testing reset deletes pending admin recovery. Deploy all numbered server files; older running previews require restarting to load the APIs (restart loses their temporary data). Local preview code notices are test-only, and tests do not verify live email delivery.
