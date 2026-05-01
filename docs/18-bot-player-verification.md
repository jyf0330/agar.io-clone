# Bot Player Verification

Use this checklist when changing the bot player entry flow.

## Automated

- `./node_modules/.bin/mocha tests/unit/bot-profile.js tests/unit/bot-client.js tests/unit/bot-actions.js`
- `./node_modules/.bin/mocha tests/unit/player-entry.js tests/unit/player-kind.js tests/unit/multiplayer-policy.js`
- `./node_modules/.bin/mocha tests/unit/player-manager.js tests/unit/game-loop-service.js`
- `npm test`
- `npm run build`

## Manual Smoke

1. Start the game server with `npm start`.
2. Start a bot player with
   `BOT_SERVER_URL=http://127.0.0.1:3000 BOT_PROFILE=doudou npm run bot:client`.
   For several bots, use
   `BOT_SERVER_URL=http://127.0.0.1:3000 BOT_COUNT=4 BOT_PROFILES=doudou,mochi npm run bot:swarm`.
3. Open a browser player and join the arena.
4. Confirm the bot appears as a live player, has a card/body profile with six
   visible assembly slots, starts with six server body parts, moves from server
   sync updates, can eat food, and disappears when the bot process exits.
5. Set `V5_BOT_PLAYERS_COMPETITIVE=0`, restart the server, and confirm bots can
   still join but do not win via body completion.
