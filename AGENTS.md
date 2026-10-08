# Instructions for agents working in this project

Read `PROJECT_GUIDE.md` before changing this project. It is the maintained project overview and handoff document. Also read the relevant source files; the guide does not replace verification against code.

For every implementation, feature, bug fix, configuration change, or workflow change:

1. Update the relevant sections of `PROJECT_GUIDE.md` in the same task.
2. Append a dated entry to its change history explaining the behavior changed, files affected, validation performed, and remaining limitations.
3. Update commands, schemas, setup instructions, and feature descriptions when they change. Do not merely append a history entry while leaving outdated instructions above it.
4. Record what was actually tested. Distinguish local mocks from deployed Apps Script verification. Never claim deployment or browser verification unless performed.

Preserve user changes. This is a Google Sheets-bound Apps Script project, not a Node production application. `local-preview/` provides disposable mocks only. Include all numbered server files when deploying. Do not reset live data, change credentials, or deploy without task authorization.

Use the existing dependency-free structure unless the task requires a change. Preserve server-side role checks, authentication field privacy, booking locks, timezone handling, payment/refund validation, and retryable external work. Run the relevant tests after changes; use the full suite when shared authentication, booking, or navigation behavior changes.

Documentation maintenance is an instruction to agents, not a background watcher. Agents using tools that do not automatically read `AGENTS.md` should be explicitly directed to read this file and `PROJECT_GUIDE.md`.
