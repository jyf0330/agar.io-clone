# AGENTS.md

Project collaboration rules for Codex and human contributors working in this
repository. Keep this file lightweight: it should contain only rules that are
needed on most tasks. Put detailed procedures in `skills/`, `docs/`, or
`memory/` and read them only when relevant.

## Project Context

- Project: `agar.io-clone`, a Node.js + Socket.IO + HTML5 Canvas multiplayer
  Agar.io-style game with NPC, memory, ghost replay, body-part, bot-player, and
  LLM demo systems layered on top.
- Package manager: `npm`.
- Main entrypoints:
  - Server: `apps/server/src/server.js`
  - Client shell: `apps/client/index.html`
  - Client app: `apps/client/src/app.js`
  - Build/watch orchestration: `gulpfile.js`
- Key directories:
  - `apps/client/src/` - browser UI, canvas rendering, socket client code.
  - `apps/server/src/` - game loop, entities, sockets, NPC/LLM/memory code.
  - `configs/game/` - tunable game configuration.
  - `tests/unit/` - Mocha unit coverage.
  - `memory/` - durable project facts, decisions, and active handoff notes.
  - `skills/` - task-specific workflows that should be read on demand.
  - `dist/`, `graphify-out/` - generated output; do not edit by hand.

## Commands

Prefer the repository scripts instead of inventing alternatives.

- Install: `npm install`
- Dev/watch: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
- Audit: `npm run audit` / production-focused `npm run audit:prod`
- Start server: `npm start`
- Week 1 demo audit: `npm run w1:all`

There is no separate typecheck command in this JavaScript project.

## Working Principles

- At the start of a new task, read `memory/short_memory.md` when it exists.
- Read relevant files before editing; match local style and module boundaries.
- Prefer the smallest focused change that solves the requested behavior.
- Do not add speculative abstractions, new dependencies, or broad rewrites
  unless the task clearly needs them.
- Keep generated output, unrelated formatting, and neighboring code churn out of
  normal diffs.
- For frontend changes, verify the actual running UI when practical.
- When a task finishes or the active context changes, update
  `memory/short_memory.md` only if the next agent would otherwise lose important
  state.

## On-Demand Guidance

Read these only when the task touches the matching area:

- `skills/add_npc_behavior.md` - NPC behavior, prompts, memory, relationships.
- `skills/update_llm_prompt.md` - LLM prompt behavior.
- `skills/add_bot_test.md` - bot-player tests and reports.
- `skills/add_client_ui_panel.md` - client UI panels and status surfaces.
- `skills/run_demo_audit.md` - demo/audit flows.
- `skills/deploy_cloud.md` - cloud sync, rebuild, restart, and verification.
- `docs/13-deployment-environments.md` - deployment/runtime environment details.
- `graphify-out/GRAPH_REPORT.md` - only for broad architecture analysis,
  cross-module refactors, or explicit graphify requests.

Do not run `graphify update .` for ordinary code edits. Run it only when the
task explicitly needs graph maintenance or the change materially alters the
architecture map.

## Project Memory And Logs

- Keep `memory/short_memory.md` brief and current.
- Put stable facts in `memory/long_memory.md`.
- Put durable architecture, gameplay, deployment, or product decisions in
  `memory/decisions.md`.
- Put hard boundaries in `memory/forbidden_changes.md`.
- Use `logs/dev_log.md` for meaningful completed development actions and
  verification results.
- Use `logs/agent_run_log.md` for notable multi-agent orchestration or handoffs.
- Do not store secrets, tokens, private key paths, `.env` contents, or production
  credentials in memory or logs.

## Git Rules

- Do not work directly on `main` for non-trivial changes.
- For Codex-created branches, prefer `codex/<topic>` unless the user asks for a
  different branch name.
- Keep commits focused on one concern.
- Before committing, run the narrowest verification that proves the change.
- Every intentional push that should affect the shared cloud server must be
  paired with the matching deploy workflow in `skills/deploy_cloud.md`.
- If a pushed change should not be synced to the cloud server, say so explicitly.

## Testing Rules

- Bug fixes should include or update a regression check when practical.
- New behavior should be covered by focused unit tests where the existing test
  shape supports it.
- If automated tests are not practical, document the manual verification path.
- Do not claim completion without fresh verification, or explicitly say what
  could not be run.

## LLM Rules

- All in-app LLM calls must go through `apps/server/src/llm/wrapper.js`.
- Business modules must not call provider SDKs or raw model endpoints directly.
- LLM output must not directly decide durable game state such as rewards,
  permanent memory writes, relationship changes, settlement outcomes, player
  progression, or moderation-sensitive actions. Route those through server-side
  rules, clamps, validators, or projection layers.
- Treat LLM responses as text, suggestions, or drafts until deterministic game
  code accepts and applies them.
- Keep LLM keys, tokens, `.env.local`, and provider credentials out of Git.
- For local Ollama details, read `docs/13-deployment-environments.md` only when
  a task actually needs a model call.

## Safety Boundaries

- Never commit secrets, private keys, `.env` contents, database credentials, or
  production tokens.
- Do not copy machine-specific private paths from desktop notes into project
  docs unless they are already part of this repository.
- Ask before destructive data migrations, large directory reshuffles, or changes
  to authentication/admin behavior.
- Keep runtime state out of source control and cloud sync unless explicitly
  intended: SQLite databases, audit logs, `.env*`, local launchers, generated
  graph output, and machine-specific files.
- Preserve the LLM wrapper boundary, cloud sync exclusions, and generated-output
  boundaries unless a task explicitly changes those contracts.
