# Deploy Cloud

Use this when syncing this project to the active cloud server.

Checklist:
- Read `AGENTS.md`, `docs/13-deployment-environments.md`, and
  `memory/forbidden_changes.md`.
- Check the worktree and identify whether uncommitted changes are being synced.
- Run the narrowest relevant local verification first; for ordinary deploys
  prefer `npm test` and `npm run build`.
- Use the documented rsync exclusions for `.git/`, `node_modules/`, `data/`,
  `.env*`, launcher state, Playwright state, `graphify-out/`, and local system
  files.
- Rebuild, restart PM2, and verify `http://127.0.0.1:3000/` from the server.
- State the target host, sync mechanism, restart result, and verification result
  in the final status and `logs/dev_log.md`.
