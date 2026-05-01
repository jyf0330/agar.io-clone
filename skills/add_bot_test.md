# Add Bot Test

Use this when adding bot-player scenarios, bot swarm behavior, fake clients,
reports, or verification helpers.

Checklist:
- Read the existing bot-related tests and `apps/bot-client/` or `apps/bot-test/`
  code before editing.
- Keep test scenarios deterministic where possible by controlling seeds, names,
  timing, or fake sockets.
- Prefer focused Mocha unit tests for parser/state-machine/report behavior.
- Avoid committing generated reports unless they are intentionally curated
  fixtures or documentation.
- Record useful verification evidence in `logs/dev_log.md`.
