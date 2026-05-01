# Run Demo Audit

Use this when validating demo scripts, playthroughs, consistency checks, or
presentation-ready flows.

Checklist:
- Read the relevant `demo/` script or audit document before running commands.
- Prefer repository scripts such as `npm run w1:all`, `npm run audit`, or
  targeted demo scripts over ad hoc command sequences.
- Capture concise evidence: command, result, generated artifact path, and any
  known gap.
- Do not commit noisy generated output unless the task explicitly asks for it.
- Summarize results in `logs/dev_log.md` when they matter for future sessions.
