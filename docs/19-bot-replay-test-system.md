# Bot Replay Test System

This development-only runner starts multiple headless player clients, drives the
normal Socket.IO player flow, and writes Chinese Markdown plus JSONL logs for
debugging full-match regressions.

## Current Real Interfaces

The current game does not expose a production room or matchmaking API. The real
player path is:

```text
connect(query.type = "player")
-> emit respawn
-> receive welcome
-> emit gotit with nickname, bodyAssembly, bodySignature, and bot flag
-> receive serverTellPlayerMove
-> emit 0 / 1 / 2 / 3 for move, eject, split, and connection attempts
-> receive settlement and RIP when the match ends
```

The body-completion screen is also not a separate server endpoint. The selected
part is represented in the `gotit` payload as `bodyAssembly` and `bodySignature`.
The test runner therefore keeps "room" and "countdown" as harness-level logs
while every Bot still uses the same server socket path as a browser player.

## Run

Start the game server separately. For quick settlement-driven smoke tests, use
demo mode so the chat command `快速结算` can trigger settlement:

```bash
V5_DEMO_MODE=1 npm start
```

Then run one automated test match:

```bash
npm run bot:test -- --bots 6 --room test-room-001 --duration 300 --logDir logs/bot-test --seed 12345
```

Useful options:

- `--bots 6` controls the Bot count.
- `--room test-room-001` names the logical test room in logs.
- `--duration 300` controls battle observation duration in seconds.
- `--logDir logs/bot-test` controls where reports are written.
- `--seed 12345` makes body choices and movement repeatable.
- `--serverUrl http://127.0.0.1:3000` targets a different server.
- `--connectTimeoutSeconds 10`
- `--bodySelectTimeoutSeconds 5`
- `--countdownTimeoutSeconds 15`
- `--battleStartTimeoutSeconds 15`
- `--matchEndTimeoutSeconds 330`
- `--settlementTimeoutSeconds 20`

## Logs

Each run creates:

```text
logs/
  bot-test/
    YYYY-MM-DD_HH-mm-ss/
      summary.md
      room_<roomId>.md
      bot_01.md
      bot_02.md
      errors.md
      raw_events.jsonl
```

Markdown logs are Chinese-readable. `raw_events.jsonl` keeps one JSON event per
line with `time`, `level`, `type`, `botId`, `roomId`, `state`, `message`, and
`data`.

`summary.md` says `测试通过：所有 Bot 成功完成对局结算` only when every Bot reaches
settlement. Failures include the Bot id, failed stage, last successful event,
possible cause, and stack or server error data when available.
