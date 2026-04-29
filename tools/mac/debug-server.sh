#!/bin/zsh
set -euo pipefail

SCRIPT_ROOT="${0:A:h}"
REPO_ROOT="${SCRIPT_ROOT:h:h}"
LOG_DIR="${REPO_ROOT}/.launcher"
STATE_DIR="${LOG_DIR}/debug-state"
DEBUG_DIST_DIR="${LOG_DIR}/debug-dist"
PORT="${AGAR_DEBUG_PORT:-3000}"
HOST="${AGAR_DEBUG_HOST:-127.0.0.1}"
NODE_BIN="${AGARIO_NODE_BIN:-$(command -v node || true)}"

if [[ ! -x "$NODE_BIN" ]]; then
    NODE_BIN="/Applications/Codex.app/Contents/Resources/node"
fi

if [[ -z "${NODE_BIN:-}" || ! -x "$NODE_BIN" ]]; then
    print -u2 "Unable to find a usable Node.js runtime."
    exit 1
fi

mkdir -p "$LOG_DIR" "$STATE_DIR/audit" "$DEBUG_DIST_DIR"
cd "$REPO_ROOT"

if [[ ! -x "./node_modules/gulp/bin/gulp.js" ]]; then
    print -u2 "Missing ./node_modules/gulp/bin/gulp.js"
    print -u2 "Run npm install in: $REPO_ROOT"
    exit 1
fi

export PORT="$PORT"
export HOST="$HOST"
export IP="$HOST"
export DIST_DIR="$DEBUG_DIST_DIR"
export MEMORY_DB_PATH="${MEMORY_DB_PATH:-$STATE_DIR/memory.db}"
export LLM_AUDIT_DIR="${LLM_AUDIT_DIR:-$STATE_DIR/audit}"

print "Starting Agar.io Clone debug server at http://$HOST:$PORT/"
print "Repo: $REPO_ROOT"
print "Build output: $DEBUG_DIST_DIR"
print "State: $STATE_DIR"

exec "$NODE_BIN" ./node_modules/gulp/bin/gulp.js watch
