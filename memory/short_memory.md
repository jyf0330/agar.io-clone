# Short Memory

Current objective:
- Phase 2 single-round rhythm reporting for the current V5 feature set.

Recent actions:
- Added selectable balance presets in `configs/game/balance-presets.js` and
  wired `V5_BALANCE_PRESET` through `configs/game/config.js`.
- Added optional balance telemetry in `apps/server/src/balance/telemetry.js`,
  wired into `game-loop-service.js` and `server.js`, writing to ignored
  `data/balance/` when `V5_BALANCE_TELEMETRY=1`.
- Documented usage and first targets in `docs/20-balance-phase-one.md`.
- Added `apps/server/src/balance/report.js` and `tools/balance-report.js` so
  `npm run balance:report` summarizes first part, first Ghost, devours, and
  completion rate by preset.
- Documented phase-two tuning rules in `docs/21-balance-phase-two-rhythm.md`.

Next step:
- Run telemetry-enabled demo and standard bot/human passes, then tune only from
  the report deltas.

Blockers:
- None.
