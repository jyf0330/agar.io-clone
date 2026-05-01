# Long Memory

- This project is a Node.js, Socket.IO, and HTML5 Canvas Agar.io-style multiplayer
  game with custom NPC, memory, ghost replay, body-part, bot-player, and LLM demo
  systems layered on top.
- The main server entrypoint is `apps/server/src/server.js`.
- The main browser shell is `apps/client/index.html`.
- The main client app entrypoint is `apps/client/src/app.js`.
- In-app LLM calls must go through `apps/server/src/llm/wrapper.js`.
- The cloud deployment target is the `agar-io-clone` PM2 service on
  `ubuntu@124.222.83.113`, serving the project on port `3000`.
