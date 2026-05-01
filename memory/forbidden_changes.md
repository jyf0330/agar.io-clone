# Forbidden Changes

- Do not bypass `apps/server/src/llm/wrapper.js` for in-app LLM calls.
- Do not commit secrets, private keys, `.env` contents, database credentials, or
  production tokens.
- Do not hand-edit generated build output in `dist/` as the source of truth.
- Do not sync local runtime state, SQLite databases, audit logs, `.env*`,
  `.launcher/`, `.playwright-cli/`, `node_modules/`, or `graphify-out/` to the
  cloud server unless a task explicitly changes the deployment contract.
- Do not assume `http://124.222.83.113/` points at this project; this project is
  expected on port `3000`.
- Do not let LLM text directly decide durable game state such as reward grants,
  permanent memory writes, relationship changes, settlement outcomes, or player
  progression without deterministic server-side validation.
