# Development Log

## 2026-05-02

- Added project memory, development log, and reusable workflow guidance adapted
  from AiTownHermesSim.
- Updated bot-test into a natural full-match flow: the runner now waits for
  service-side settlement/game-end events and uses `matchEndTimeoutSeconds` only
  as the fallback instead of sending quick-settlement chat. The simulated player
  records part-loot targeting, ghost encounters, skills, chat, settlement key
  events, body pickup/devour/body-complete evidence, and summary timeline
  coverage. Verification:
  `npm test -- tests/unit/bot-test-client.js tests/unit/bot-test-runner.js tests/unit/bot-test-report.js`
  passed with 18 tests.
- Tightened bot-test behavior validation so each simulated player must cover
  body completion, server sync, movement, eject mass, split, and connection
  attempt during the validation window. Skill actions now respect a default
  4-second cooldown instead of being frame-bursted. Verified with
  `./node_modules/.bin/mocha tests/unit/bot-test-client.js tests/unit/bot-test-runner.js`.
- Ran a real 6-Bot smoke against explicit demo mode on port 3101:
  `logs/bot-test/2026-05-02_01-58-47` passed with all Bots completing
  settlement. A prior run against an already-occupied port 3100 failed because
  the existing service did not complete demo quick settlement.
- Added `npm run bot:summary` to turn noisy bot-test JSONL/Markdown logs into a
  concise dated timeline. It keeps run status, room milestones, each Bot's first
  eject/split/connection action, and settlement while dropping coordinates and
  repeated skill spam.

# 2026-05-02 - Balance Phase One Foundation

- Added `demo`, `standard`, and `long` balance presets selectable through
  `V5_BALANCE_PRESET`; `V5_DEMO_MODE=1` continues to select the demo tuning.
- Added optional JSONL balance telemetry for world snapshots, part pickups, and
  player devour events under `data/balance/`.
- Documented phase-one targets and operating instructions in
  `docs/20-balance-phase-one.md`.
- Verification: targeted Mocha coverage for balance presets, balance telemetry,
  demo config, and game-loop service passed.

# 2026-05-02 - Balance Phase Two Rhythm Report

- Added a balance rhythm report module and `npm run balance:report` CLI to
  summarize `data/balance/*.jsonl` by preset.
- Added settlement telemetry so completion rate can be evaluated against demo,
  standard, and long-session target bands.
- Documented single-round rhythm tuning rules in
  `docs/21-balance-phase-two-rhythm.md`.

# 2026-05-02 - Humanized Bot MVP

- Added opt-in humanized socket bot actions: nearby larger-player avoidance,
  aggressive pursuit of clearly smaller nearby players, probability-gated
  split/eject actions, and low-frequency local chat templates.
- Updated `doudou` and `mochi` demo bot profiles with distinct behavior
  personas and chat lines.
- Verification: `npm test -- --grep bot-actions` ran the gulp lint+mocha suite
  and passed with 336 tests.
- Tightened the bot-test acceptance gate so every bot must cover the full MVP
  behavior set within the 120-second validation window: body selection, sync,
  movement/resource or cruise, avoidance, pursuit, eject, split, connection,
  and local chat. Verification: `npm test -- --grep "bot test|simulated player|bot-actions|bot-profile"` passed with 337 tests.
- Ran a clean 6-Bot 120-second MVP acceptance round on local port 3102 with
  `V5_DEMO_MODE=1 V5_NPC_ENABLED=0`; `logs/bot-test/2026-05-02_02-56-09`
  passed with 6 successes, 0 failures, and completed settlement. A prior run
  against the pre-existing service on port 3000 failed because only two Bots
  reached welcome/gotit and later disconnected.
- Updated bot-test summaries to show game-time evidence as `MM:SS`, map
  coordinates, actor, and event. Re-ran the clean 6-Bot 120-second MVP
  acceptance round on port 3103; `logs/bot-test/2026-05-02_16-57-52` passed and
  now shows resource movement, cruise, avoidance, pursuit, chat, eject, split,
  connection, settlement request, and settlement completion on the game timeline.

# 2026-05-03 - Natural Bot Test Simulation Evidence

- Ran focused bot-test units after converting the runner to wait for natural
  settlement instead of requesting quick settlement:
  `npm test -- tests/unit/bot-test-client.js tests/unit/bot-test-runner.js tests/unit/bot-test-report.js`
  passed with 18 tests.
- Ran live Socket.IO bot simulations against an isolated current-source server
  on port 3104. The existing port 3000 service answered HTTP/Engine.IO polling
  but did not complete the Node bot client's Socket.IO namespace connection.
- Short live runs produced ignored reports under `logs/bot-test/`: one run
  covered connect/respawn/welcome/gotit/countdown/battle plus ghost, food,
  part loot, cruise, avoidance, pursuit, chat, eject, split, and connection
  attempt, then failed because `matchEndTimeoutSeconds` expired before natural
  settlement; another covered most behavior but failed the behavior gate because
  part loot was not visible before the validation window ended.
- Fixed the bot-test CLI behavior window so `--behaviorValidationSeconds`
  cannot shrink the full-player operation coverage below the required
  120-second window. Verification:
  `npm test -- tests/unit/bot-test-config.js tests/unit/bot-test-client.js tests/unit/bot-test-runner.js tests/unit/bot-test-report.js`
  passed with 21 tests.
- Ran a successful natural-settlement bot-test simulation against an isolated
  current-source demo server on port 3105:
  `logs/bot-test/2026-05-03_10-36-17` passed with 1 success, 0 failures,
  196 raw JSONL events, 95 battle behavior events, 80 battle skill events, and
  service settlement `endedReason=round_end` at game time 07:33. The summary
  timeline includes room entry, body selection, gotit, countdown, battle start,
  first sync, ghost encounter, food targeting, part-loot targeting, random
  cruise, avoidance, pursuit, chat, eject, split, connection attempt, settlement,
  RIP, and room game-end events.
- Fixed summary timeline compression so repeated in-battle behavior/skill rows
  are sampled every 60 seconds after their first occurrence instead of being
  fully deduped. Regenerated the ignored
  `logs/bot-test/2026-05-03_10-36-17/summary.md`; it now shows mid-match rows
  between the initial skills and final settlement. Verification:
  `npm test -- tests/unit/bot-test-config.js tests/unit/bot-test-client.js tests/unit/bot-test-runner.js tests/unit/bot-test-report.js`
  passed with 22 tests.
- Ran a 4-Bot production-environment attempt against
  `http://124.222.83.113:3000` using the real player Socket.IO flow and no
  behavior-window early stop. TCP port 3000 accepted connections, but HTTP `/`,
  Engine.IO polling for EIO=3/EIO=4, default Socket.IO, and websocket-only
  Socket.IO all failed with empty reply / `xhr poll error` / `websocket error`.
  The generated ignored report `logs/bot-test/2026-05-03_10-59-05` shows 0/4
  Bots reached the waiting room; all failed during `Connecting`. Added a runner
  regression so join failures stop before countdown/battle behavior validation.
  Verification:
  `npm test -- tests/unit/bot-test-config.js tests/unit/bot-test-client.js tests/unit/bot-test-runner.js tests/unit/bot-test-report.js`
  passed with 23 tests.

# 2026-05-03 - Humanized Bot Swarm Movement Fix

- Adapted bot behavior ideas from the MIT-licensed `Apostolique/Agar.io-bot`
  repository: threat-first escape, richer food target scoring, edge recovery,
  and non-static wandering.
- Fixed bot movement input so world-space decisions are converted into the
  existing player-relative Socket.IO movement protocol before emitting event
  `0`.
- Kept swarm clients strongly referenced in the CLI entrypoint and added clean
  disconnect handling so bot sockets do not disappear after startup.
- Added stuck recovery so humanized bots force a short wander period after
  several low-movement ticks instead of hovering over tiny local targets.
- Verification:
  `./node_modules/.bin/mocha tests/unit/bot-actions.js tests/unit/bot-client.js tests/unit/bot-swarm.js`
  passed with 22 tests.
- Live verification on local port 3108 with 8 bots over a 30-second spectator
  sample: 125 spectator frames, one connection per bot name, no hard-edge bots,
  and every bot moved visibly with spans from 427px to 1312px.

# 2026-05-03 - Bot-Test Full Natural Match Coverage

- Removed the bot-test runner's fixed behavior-window early stop from the
  normal flow. The runner now waits for server-emitted settlement/game over;
  `matchEndTimeoutSeconds` is only a fallback timeout. Completed runs still
  fail after settlement if `raw_events.jsonl` lacks required timeline events.
- Added report timeline coverage for the real player flow and required
  human-like events, including late devour/body-complete/settlement events even
  when the summary timeline is long.
- Fixed bot-test player movement to emit browser-style relative Socket.IO
  movement input while keeping world-space targeting for readable logs.
- Made body completion require one own signature part plus collected outside
  parts, excluding starter loadout material; added heart map loot so natural
  completion is reachable. Bot-test combat steering now keeps pursuing real
  players until server-side devour coverage is recorded.
- Red verification captured:
  `npm test -- tests/unit/bot-test-runner.js --grep "should not stop battle early"`
  failed before the runner change because the match ended before natural
  settlement; `npm test -- tests/unit/body.js --grep "equipped outside parts"`
  failed before ownership-transfer completion fix; `npm test -- tests/unit/body.js --grep "starter loadout"`
  failed before excluding starter loadout; `npm test -- tests/unit/bot-test-client.js --grep "move during battle"`
  failed before relative movement; `npm test -- tests/unit/bot-test-client.js --grep "devour coverage"`
  failed before combat pursuit; `npm test -- tests/unit/bot-test-report.js --grep "required late key events"`
  failed before preserving late required timeline rows.
- Green verification:
  `node ./node_modules/gulp/bin/gulp.js build` passed with 369 tests during the
  server-body change cycle; `npm test -- tests/unit/bot-test-*.js tests/unit/body.js tests/unit/demo-config.js`
  passed with 56 tests; `npm test -- tests/unit/bot-test-runner.js --grep "should not stop battle early"`
  passed with 5 tests; final full `npm test` passed with 370 tests.
- Final live local match:
  `node apps/bot-test/src/index.js --bots 8 --room codex-full-match-2135 --countdown 0 --matchEndTimeoutSeconds 540 --settlementTimeoutSeconds 30 --serverUrl http://127.0.0.1:3117 --seed 20260503`
  against an isolated `V5_NPC_ENABLED=0 V5_DEMO_MODE=1` server naturally
  completed with `logs/bot-test/2026-05-03_21-34-50`. Raw event evidence:
  1003 total events; connect 16, lobby/respawn 8, welcome/request 8, gotit 8,
  countdown 9, battle start 9, battle behavior 440, ghost 6, chat 8, skills
  361, devour 23, being devoured 10, body part pickup 37, body complete 8,
  settlement entered 8, settlement complete 8, missing key events 0, ended
  reason `body_complete`. Summary shows the same late devour, being-devoured,
  body pickup, body complete, settlement, RIP, and room game-end timeline rows.
- Follow-up report fix: summary capping now preserves the first visible row for
  every required player-flow and human-like battle category, not only late
  settlement/combat rows. Added a regression that fails when countdown, battle
  start, food seeking, random cruise, avoidance, pursuit, part-loot pursuit,
  ghost encounter, eject, split, connection attempt, or chat are dropped by
  capping. Regenerated ignored report `logs/bot-test/2026-05-03_21-34-50/summary.md`
  from its existing `raw_events.jsonl`; the regenerated timeline explicitly
  shows `倒计时开始：0 秒`, battle start, all required early battle behaviors,
  devour/being-devoured, body pickups, body complete, and settlement. Red
  verification: `npm test -- tests/unit/bot-test-report.js --grep "required human-like battle category"`
  failed before the selector change because countdown was missing. Green
  verification: the same focused regression passed; `npm test -- tests/unit/bot-test-*.js`
  passed with 33 tests; full `npm test` passed with 371 tests.

# 2026-05-04 - Bot-Test Body-Complete Report Diagnosis

- Checked the main settlement flow after live bot-test data showed every bot
  logging `body complete` during a `body_complete` round. Server-side
  `settleBodyCompletion()` intentionally settles every active human/socket-bot
  player with round-level `endedReason=body_complete` and a shared
  `winnerName`; this is the normal game-end flow, not proof that every player
  completed a body.
- Fixed bot-test settlement recording so only the actual winner logs
  `body complete` from settlement. Meta-update body completion still records
  the winner naturally during battle, and `bodyCompleteLogged` prevents a
  duplicate settlement-side completion row.
- Added a regression for a non-winner receiving body-complete settlement. Red
  verification:
  `npm test -- tests/unit/bot-test-client.js --grep "should not log body complete for non-winners"`
  failed before the fix because Bot_09 logged `body complete` for winner
  Bot_03.
- Green verification:
  `npm test -- tests/unit/bot-test-client.js --grep "should not log body complete for non-winners"`
  passed with 13 tests; focused bot-test tests passed with 30 tests; full
  `npm test` passed with 372 tests.
- Live verification on isolated local port 3118:
  `node apps/bot-test/src/index.js --bots 8 --room codex-mainflow-check --countdown 0 --matchEndTimeoutSeconds 540 --settlementTimeoutSeconds 30 --serverUrl http://127.0.0.1:3118 --seed 20260504`
  generated ignored report `logs/bot-test/2026-05-04_00-02-42`. Evidence:
  summary passed, `settlementCount=8`, `settlementReasons=body_complete`,
  `bodyCompleteBots=Bot_04:Bot_04`, `bodyCompleteCount=1`, no
  quick-settlement shortcuts, and no missing required timeline events.
- Follow-up continuity diagnosis: the latest raw JSONL did keep bot data through
  the full battle. Each of the 8 Bots had battle behavior/skill rows in minutes
  00, 01, 02, 03, and 04, with last battle data at 04:35-04:37. The apparent
  "later data disappeared" issue was caused by `summary.md` being a capped key
  timeline. Added a `Bot 持续数据覆盖` section to summaries so each Bot shows
  battle data count, covered minutes, and last battle data timestamp. Red
  verification:
  `npm test -- tests/unit/bot-test-report.js --grep "continuous per-bot battle data coverage"`
  failed before the section existed. Green verification: the same regression
  passed, focused bot-test suite passed with 31 tests, and full `npm test`
  passed with 373 tests. Regenerated ignored report
  `logs/bot-test/2026-05-04_00-02-42/summary.md` from existing raw events.

# 2026-05-04 - Default Three Socket Bots And Event-Only Chat

- Changed the live server default so starting the server now auto-starts and
  retains three Socket.IO player bots through the normal bot-client flow. The
  default can be disabled with `V5_DEFAULT_BOTS=0` or resized with
  `V5_DEFAULT_BOT_COUNT`.
- Removed random/idle chat generation from real bot actions and from bot-test
  simulated players. Bot chat is now event-only: food mass gain, body-part
  pickup, devour, being devoured, and body completion. The bot-test fallback
  settlement helper also no longer sends `快速结算` as player chat.
- Removed `chatChance` / `chatLines` from the bundled Doudou and Mochi bot
  profiles so profile defaults no longer advertise idle chatter.
- Red verification before implementation: focused tests failed for missing
  `apps/server/src/default-bot-swarm.js`, missing event chat on mass gain and
  settlement devour events, and random chat still being generated by
  `planBotActions`.
- Green verification: focused default/chat tests passed with 39 tests; wider
  bot-related unit set passed with 63 tests; `npm run build` passed with 381
  tests and regenerated dist.
- Live verification: restarted the local play session on
  `http://127.0.0.1:3123` using only the server process. Log
  `logs/live-match/2026-05-04_00-53-13/server.log` shows the server default
  started `Doudou_Bot_1`, `Mochi_Bot_2`, and `Doudou_Bot_3`, retained three
  bot clients, and reached `Total players: 4` when the human player joined.
  Recent `data/server-db/db.sqlite3` chat rows show only event messages like
  `我吃到了食物，质量 +1`.
