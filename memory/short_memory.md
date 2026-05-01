# Short Memory

Current objective:
- Phase 1 numeric design foundation for the current V5 feature set.

Recent actions:
- Added selectable balance presets in `configs/game/balance-presets.js` and
  wired `V5_BALANCE_PRESET` through `configs/game/config.js`.
- Added optional balance telemetry in `apps/server/src/balance/telemetry.js`,
  wired into `game-loop-service.js` and `server.js`, writing to ignored
  `data/balance/` when `V5_BALANCE_TELEMETRY=1`.
- Documented usage and first targets in `docs/20-balance-phase-one.md`.
- Ran `npm test`, `npm run build`, and `graphify update .` successfully.

Next step:
- Add a report command that summarizes `data/balance/*.jsonl` into per-preset
  curves, then run bot swarms for demo/standard baselines.

Blockers:
- None.
