# AGENTS.md

Project collaboration rules for Codex and human contributors working in this
repository.

## Project Context

- Project name: `agar.io-clone`
- Goal: Node.js + Socket.IO + HTML5 Canvas multiplayer Agar.io-style game with
  custom NPC, memory, ghost replay, body-part, and LLM demo systems layered on
  top.
- Package manager: `npm`
- Main entrypoints:
  - Server: `apps/server/src/server.js`
  - Client shell: `apps/client/index.html`
  - Client app: `apps/client/src/app.js`
  - Build/watch orchestration: `gulpfile.js`
- Important directories:
  - `apps/client/src/` - browser UI, canvas rendering, player card/editor UI,
    socket client code.
  - `apps/server/src/` - game loop, map entities, sockets, NPC/LLM/memory,
    repositories.
  - `configs/game/` - tunable game configuration.
  - `demo/` - planning docs, playthrough scripts, audit tooling, demo assets.
  - `docs/` - architecture and runtime notes.
  - `tests/unit/` - Mocha unit coverage.
  - `dist/` - generated build output; do not edit by hand.
  - `graphify-out/` - generated knowledge graph output.

## Commands

Prefer the repository scripts instead of inventing alternatives.

- Install: `npm install`
- Dev/watch: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
- Start server: `npm start`
- Week 1 demo audit: `npm run w1:all`

There is no separate typecheck command in this JavaScript project.

## Working Principles

- Read relevant files before editing; match local style and module boundaries.
- Prefer the smallest focused change that solves the requested behavior.
- Do not add speculative abstractions, new dependencies, or broad rewrites
  unless the task clearly needs them.
- Keep generated output, unrelated formatting, and neighboring code churn out of
  normal diffs.
- State meaningful assumptions when requirements are ambiguous.
- For frontend changes, verify the actual running UI when practical.

## Git Rules

- Do not work directly on `main` for non-trivial changes.
- For Codex-created branches, prefer `codex/<topic>` unless the user asks for a
  different branch name.
- Keep commits focused on one concern.
- Before committing, run the narrowest verification that proves the change.
- If a cloud deployment is later added to this repository, every intentional
  push should be paired with the matching deploy or sync step, and the target
  environment should be stated.

## Testing Rules

- Bug fixes should include or update a regression check when practical.
- New behavior should be covered by focused unit tests where the existing test
  shape supports it.
- If automated tests are not practical, document the manual verification path.
- Do not claim completion without fresh verification, or explicitly say what
  could not be run.

## LLM and Local Ollama Rules

- All in-app LLM calls must go through `apps/server/src/llm/wrapper.js`.
- Business modules must not call provider SDKs or raw model endpoints directly.
- Keep LLM keys, tokens, `.env.local`, and provider credentials out of Git.
- For local development, prefer the OpenAI-compatible local Ollama endpoint from
  the desktop rules when a real model is needed:
  - Base URL: `http://127.0.0.1:11434/v1`
  - Default local model: `gemma4-aggressive:latest`
  - Placeholder API key: `ollama`
- Before relying on local Ollama, quickly verify:
  - `curl -sS --max-time 5 http://127.0.0.1:11434/api/tags`
  - `curl -sS --max-time 5 http://127.0.0.1:11434/v1/models`
- If local Ollama is unavailable, try starting the Ollama app before asking to
  use a cloud model.
- Do not use old LAN Ollama addresses unless the user explicitly requests them.

## Safety Boundaries

- Never commit secrets, private keys, `.env` contents, database credentials, or
  production tokens.
- Do not copy machine-specific private paths from desktop notes into project
  docs unless they are already part of this repository.
- Ask before destructive data migrations, large directory reshuffles, or changes
  to authentication/admin behavior.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
