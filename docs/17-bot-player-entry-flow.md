# Bot Player Entry Flow

This note separates player-like actors before bot players move onto the normal
socket entry path.

## Actor Kinds

- `human`: a browser client controlled by a person.
- `bot`: a headless socket client controlled by code. It should enter through
  the same player payload and socket events as a human.
- `npc`: a narrative actor managed by the NPC orchestrator. It can reuse the
  `Player` body model, but it is not a competitive player.
- `ghost`: a replay projection from historical memory. It is rendered in the
  world but does not own a live player body.

## Rule

Competitive multiplayer rules should prefer `playerKind` over ad-hoc `isNpc`
checks. Bots are competitive players; NPC actors are not. This lets future bot
clients pick body parts, connect over Socket.IO, and send the same input events
as human clients without being treated as server-internal pets.

## Shared Entry Payload

Human clients and bot clients both enter through `gotit` with the normalized
player entry payload:

```json
{
  "name": "Bot_One",
  "screenWidth": 1280,
  "screenHeight": 720,
  "playerCardPreviewDataUrl": "data:image/png;base64,...",
  "bodySignature": {
    "slotType": "FOOT",
    "templateId": "foot-default"
  },
  "bodyAssembly": {
    "missingPartType": "leg_left",
    "selectedParts": {
      "head": "head_option_03",
      "body": "body_option_02",
      "hand_left": "hand_left_option_01",
      "hand_right": "hand_right_option_02",
      "leg_left": "leg_left_option_01",
      "leg_right": "leg_right_option_01"
    }
  },
  "consentToRecord": true,
  "isReplayAllowed": true,
  "isBot": true
}
```

The server normalizes and applies this payload through
`apps/server/src/player-entry.js`. Bot entry must use `isBot: true`; it must not
set `isNpc`.

## Headless Bot Client

`apps/bot-client/src/index.js` starts a headless Socket.IO player client:

```bash
BOT_SERVER_URL=http://127.0.0.1:3000 BOT_PROFILE=doudou npm run bot:client
```

The client connects with `query.type = "player"` and sends the same `gotit`
payload shape as the browser. It is a live socket player, not a server-internal
`map.players.pushNew()` shortcut.

Bot player profiles live in `demo/bot-players/*.json`. A profile is the
headless equivalent of the pregame body selection flow: it supplies the bot
name, generated card preview, `bodySignature`, `bodyAssembly`, and strategy
settings that later action planning can use.

`bodyAssembly.selectedParts` must describe the same six visible assembly slots
as the browser body-selection page: `head`, `body`, `hand_left`, `hand_right`,
`leg_left`, and `leg_right`. `apps/bot-client/src/bot-profile.js` expands older
three-category profile data into those six slots before the `gotit` payload is
sent.

## Action Layer

Bot strategy emits player-like actions:

- `moveTarget`
- `ejectMass`
- `split`
- `attemptConnection`

`apps/bot-client/src/bot-actions.js` maps those actions onto the existing socket
protocol: `'0'`, `'1'`, `'2'`, and `'3'`. The game server still receives the
same input events it receives from a browser player.

## Multiplayer Policy

`apps/server/src/multiplayer-policy.js` defines who counts as a competitive
multiplayer player. By default, humans and socket bots are competitive, while
NPC actors are not. Set `V5_BOT_PLAYERS_COMPETITIVE=0` to exclude socket bots
from leaderboard mass totals and body-completion win conditions while still
letting them connect and move as live players.
