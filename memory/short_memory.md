# Short Memory

Current objective:
- Live player disconnects should be recoverable: heartbeat gaps must not kick
  the player, and a browser reconnect should reclaim the same in-game player.

Recent actions:
- Added browser reconnect tokens for player clients and server-side retained
  player binding. Human players with a reconnect token now stay in the map for
  `config.reconnectTimeoutMs` (default 60000ms) after socket disconnect and a
  new socket with the same token receives the original player id/state.
- Removed the heartbeat-timeout `kick` path from `game-loop-service`; stale
  heartbeat gaps now pause player ticking instead of sending `kick` and forcing
  a server disconnect.
- Added regression coverage for heartbeat gaps and Socket.IO reconnect restore.
  Verification: targeted reconnect tests passed with 38 tests; `npm run build`
  rebuilt the client/server bundles and passed 391 tests; local service was
  restarted on `http://127.0.0.1:3000` and a browser smoke confirmed the
  `开放吞噬` shell loads with the start controls visible and no console errors.
- Disabled Ghost Echo, NPC, and pet systems by default behind opt-in env flags:
  `V5_GHOST_ENABLED=1`, `V5_NPC_ENABLED=1`, and `V5_PET_ENABLED=1`.
- Updated server startup so GhostManager/GhostRecorder are only constructed
  when ghost is enabled; default players now start with `activePet=null`, and
  pet switching/active-pet assignment only runs when pet is enabled.
- Updated the client feature gate so NPC event UI is off by default and only
  appears when explicitly requested.
- Verification: targeted tests for config, game loop, player projection,
  socket controller, and hydration passed with 41 tests; targeted
  `npm run build -- tests/unit/demo-config.js tests/unit/game-loop-service.js
  tests/unit/player-projection.js tests/unit/socket-controller.js
  tests/unit/player-hydration.js` passed and rebuilt the client bundle.
- Fixed the normal Socket.IO bot event-chat gap in `apps/bot-client/src/`:
  bots now target visible part loot and chat for food/part/wander/wait intent,
  chase/avoid intent, split/eject/connect skills, body-part pickup, devour,
  being devoured, own death, observed death, and body completion.
- Verification after the bot chat fix: focused bot/client/socket-flow tests
  passed with 28 tests, broader bot/body/game-loop coverage passed with 111
  tests, and full `npm test` passed with 385 tests.
- Added focused bot-test unit coverage for natural settlement waiting, missing
  required timeline events, complete summary timelines, raw JSONL preservation,
  part-loot targeting, ghost encounters, and settlement key-event logging.
- Updated `apps/bot-test/src/runner.js` so `matchEndTimeoutSeconds` is the
  fallback timeout and the runner no longer calls `requestSettlement()` during
  normal tests.
- Updated `apps/bot-test/src/simulated-player-client.js` and
  `apps/bot-test/src/report-generator.js` to record/emit full-match timeline
  events including part loot, ghost, chat, skills, devour, body pickup, body
  complete, and settlement endedReason.
- Updated `apps/bot-test/src/config.js` so CLI
  `--behaviorValidationSeconds` cannot shrink the required 120-second
  full-player operation coverage window.
- Ran a successful natural-settlement simulation on local port 3105; report
  `logs/bot-test/2026-05-03_10-36-17` passed with `endedReason=round_end`
  after game time 07:33 and includes the full key timeline.
- Updated `apps/bot-test/src/report-generator.js` so summary timelines keep
  60-second samples of repeated battle behavior/skills instead of collapsing
  the middle of long matches.
- Ran a 4-Bot production attempt against `http://124.222.83.113:3000`; TCP
  connects but HTTP/Engine.IO/Socket.IO return empty reply or socket errors, so
  report `logs/bot-test/2026-05-03_10-59-05` failed at Connecting for all Bots.
  Runner now stops cleanly on join failures before logging countdown/battle.
- Updated `gulpfile.js` so `npm test -- tests/unit/file.js ...` filters Mocha
  files instead of treating those paths as gulp task names.
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
- Diagnosed the abnormal live bot-test data: server main flow settles all
  active human/socket-bot players with round-level `endedReason=body_complete`
  when one winner completes the body; `winnerName` identifies the completer.
  The bot-test client was incorrectly logging `body complete` for every
  settled player.
- Added regression coverage in `tests/unit/bot-test-client.js` and fixed
  `apps/bot-test/src/simulated-player-client.js` so settlement-side
  `body complete` is logged only by the winning bot, while meta-update body
  completion still records natural battle completion.
- Verification after the fix: focused non-winner regression passed, focused
  bot-test suite passed, full `npm test` passed with 372 tests, and live local
  report `logs/bot-test/2026-05-04_00-02-42` passed with
  `settlementCount=8`, `bodyCompleteCount=1`, winner `Bot_04`, no quick
  settlement shortcuts, and no missing timeline events.
- Follow-up continuity check found raw bot data was not missing: all 8 Bots had
  battle behavior/skill data in minutes 00-04 of
  `logs/bot-test/2026-05-04_00-02-42/raw_events.jsonl`, with last battle data
  at 04:35-04:37. The missing-looking later data was caused by summary timeline
  capping. `apps/bot-test/src/report-generator.js` now adds a
  `Bot 持续数据覆盖` section listing per-bot battle data count, covered minutes,
  and last battle data timestamp; `tests/unit/bot-test-report.js` has regression
  coverage. Full `npm test` passed with 373 tests.
- Added `apps/server/src/default-bot-swarm.js` and wired `server.js` so a normal
  server start defaults to three retained Socket.IO bot clients. Use
  `V5_DEFAULT_BOTS=0` to disable and `V5_DEFAULT_BOT_COUNT` to resize.
- Removed profile random chatter from `apps/bot-client/src/bot-actions.js` and
  `apps/bot-test/src/simulated-player-client.js`; bots now speak through
  event/behavior chat for movement intent, skills, ghost encounters, food mass
  gain, body-part pickup, devour, being devoured, own death, observed death,
  and body completion. The bot-test fallback settlement helper no longer sends
  `快速结算` as player chat. Doudou/Mochi profile `chatChance` and `chatLines`
  were removed.
- Verification for the default/chat change: focused tests passed with 39 tests,
  broader bot-related tests passed with 63 tests, and `npm run build` passed
  with 381 tests.
- Live local play is currently running at `http://127.0.0.1:3123` from only the
  server process, using the new code default. Evidence log:
  `logs/live-match/2026-05-04_00-53-13/server.log` shows three default bots
  plus the human player (`Total players: 4`). Chat rows in
  `data/server-db/db.sqlite3` show event messages like
  `我吃到了食物，质量 +1`.
- Runtime follow-up: `gulp watch`/the existing `node dist/server/server.js`
  process does not reload `apps/bot-client/src/` changes automatically. The
  first 3123 restart attempt failed with `EADDRINUSE` because old PID 34471 was
  still listening. After killing it and restarting `agar-human-3bots`, a
  spectator Socket.IO listener on `http://127.0.0.1:3123` received bot chat:
  `我去捡部位`, `我吃到了食物，质量 +1`, and `我在巡游找目标`.

Next step:
- If continuing from here, open `http://127.0.0.1:3123` and play against the
  three server-default bots. For bot-test reports, keep checking raw JSONL for
  event-only chat and natural settlement; do not commit generated reports.

Blockers:
- None.
