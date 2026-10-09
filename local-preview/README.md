Run from the project folder:

```powershell
node local-preview/server.cjs
```

Open http://127.0.0.1:8787 in your browser. Stop with Ctrl+C.

Accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | Admin123! |
| Regular candidate | candidate@example.com | Candidate123! |
| Percentage candidate | maya@example.com | Candidate123! |

The preview serves the self-contained Index.html (including styles and client helpers), injecting a local google.script.run
adapter. Reload to see saved UI changes. Restart for server-code changes or to
restore sample data. Candidate IDs are generated on each restart; use email login.

The actual server functions run against in-memory Sheets, Properties, Calendar,
Contacts and email mocks. Sample bookings include today/future dates, payment
statuses, and a refund. Registration, login, recovery, sessions, editing, search,
availability and booking operations run locally. Recovery codes appear in the shared in-page popup.

No live Google account or Sheet is accessed. State is lost on restart. Browser
session storage uses a separate local-preview key. These mocks cannot verify
Google authorization, quotas, concurrency, actual email delivery, Calendar or
Contacts integration. Those still need Apps Script testing.

Do not upload this directory to Apps Script. Its .cjs/.txt/.md files are outside
the script/HTML/JSON extensions configured in this project's .clasp.json.
