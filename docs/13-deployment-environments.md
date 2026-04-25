# Deployment Environments

This project runs in three practical environments: local development, desktop
launchers, and the shared cloud server. Keep runtime state outside source code
unless the environment is explicitly disposable.

## Local Development

- Use `npm install`, `npm run build`, `npm test`, and `npm start`.
- Local `.env.local` may use the default `data/` paths.
- Local Ollama can use `OPENAI_BASE_URL=http://127.0.0.1:11434/v1` with
  `OPENAI_API_KEY=ollama`.
- Do not commit `.env.local`, SQLite databases, cache files, or audit logs.

## Desktop Launchers

- macOS launcher scripts live under `tools/mac/`.
- Windows launcher scripts live under `tools/windows/`.
- Launcher runtime copies may rebuild or install dependencies in OS-specific
  application/cache folders. They should not write generated output back into
  the repository.
- Keep repo scripts cross-platform. Put OS-specific shell behavior in
  `tools/mac/` or `tools/windows/`, not in shared npm scripts.

## Cloud Server

Use Node.js 20 or newer. The current LLM SDK and refreshed build/test toolchain
do not support the old Node 14 Docker baseline.

Set these paths on the cloud host so runtime state survives git syncs and does
not pollute the repository checkout:

```sh
SERVER_DB_PATH=/var/lib/agario/server.sqlite3
MEMORY_DB_PATH=/var/lib/agario/memory.sqlite3
LLM_CACHE_DB_PATH=/var/lib/agario/llm-cache.sqlite3
LLM_CACHE_FALLBACK_PATH=/var/lib/agario/llm-cache.json
LLM_AUDIT_DIR=/var/log/agario/llm-audit
```

`SERVER_DB_PATH` controls the legacy admin/chat SQLite database used by
`apps/server/src/sql.js`. `MEMORY_DB_PATH` controls the V5 memory and historical
echo store. `LLM_CACHE_DB_PATH` and `LLM_CACHE_FALLBACK_PATH` control LLM cache
state. `LLM_AUDIT_DIR` controls JSONL audit log output.

Recommended cloud sync shape:

```sh
git pull
npm install
npm run build
npm test
npm run audit:prod
# restart with the host's service manager, for example pm2/systemd/docker compose
```

State the target host, command used, and result after every push that should
affect the shared cloud server.

## SQLite Notes

- `better-sqlite3` is preferred when available.
- `apps/server/src/sql.js` can fall back to Python `sqlite3` for the legacy
  server database when the native module is unavailable.
- `apps/server/src/memory/store.js` uses Python `sqlite3`; set `PYTHON` or
  `PYTHON3` if the deployment image does not expose `python3`.
- For production, keep SQLite files on persistent disk and back them up before
  destructive cleanup or schema migration work.

## Audit Notes

`npm audit fix` has been run without `--force`, the unused `sqlite3` and `uuid`
packages were removed, build/test wrappers were modernized, and the lockfile was
refreshed. `npm run audit` and `npm run audit:prod` should both report zero
known vulnerabilities before a cloud sync.
