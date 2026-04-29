#!/bin/zsh
set -euo pipefail

URL="${AGARIO_URL:-http://127.0.0.1:3000}"
STARTUP_TIMEOUT_SECONDS="${AGARIO_STARTUP_TIMEOUT_SECONDS:-60}"
NPM_VERSION="${AGARIO_NPM_VERSION:-10.9.4}"

SCRIPT_ROOT="${0:A:h}"
REPO_ROOT="${SCRIPT_ROOT:h:h}"
RUNTIME_BASE="${HOME}/Library/Application Support/AgarioClone"
RUNTIME_DIR="${RUNTIME_BASE}/runtime"
STATE_DIR="${RUNTIME_BASE}/state"
CACHE_DIR="${HOME}/Library/Caches/AgarioClone"
LOG_DIR="${HOME}/Library/Logs/AgarioClone"
LOG_FILE="${LOG_DIR}/launcher.log"
NODE_BIN="${AGARIO_NODE_BIN:-$(command -v node || true)}"

if [[ ! -x "$NODE_BIN" ]]; then
    NODE_BIN="/Applications/Codex.app/Contents/Resources/node"
fi

if [[ -z "${NODE_BIN:-}" || ! -x "$NODE_BIN" ]]; then
    print -u2 "Unable to find a usable Node.js runtime."
    exit 1
fi

if /usr/bin/python3 - <<'PY' >/dev/null 2>&1
import distutils.version
PY
then
    export PYTHON="/usr/bin/python3"
    export npm_config_python="/usr/bin/python3"
fi

function test_local_url() {
    curl -fsS -I --max-time 2 "$URL" >/dev/null 2>&1
}

function open_game_url() {
    open "$URL" >/dev/null 2>&1 || true
}

function current_epoch_seconds() {
    date +%s
}

function ensure_npm_cli() {
    local npm_dir="${CACHE_DIR}/npm"
    local npm_cli="${npm_dir}/package/bin/npm-cli.js"

    if [[ -f "$npm_cli" ]]; then
        print -- "$npm_cli"
        return 0
    fi

    mkdir -p "$npm_dir"
    rm -rf "$npm_dir/package" "$npm_dir/npm.tgz"
    curl -L "https://registry.npmjs.org/npm/-/npm-${NPM_VERSION}.tgz" -o "$npm_dir/npm.tgz"
    tar -xzf "$npm_dir/npm.tgz" -C "$npm_dir"

    print -- "$npm_cli"
}

function sync_runtime() {
    mkdir -p "$RUNTIME_DIR"
    rsync -a --delete \
        --exclude '.git/' \
        --exclude '.launcher/' \
        --exclude '.env' \
        --exclude '.env.local' \
        --exclude '.DS_Store' \
        --exclude 'data/' \
        --exclude 'graphify-out/' \
        --exclude 'node_modules/' \
        "$REPO_ROOT/" "$RUNTIME_DIR/"
}

function ensure_dependencies() {
    local npm_cli="$1"
    local stamp_file="$RUNTIME_DIR/node_modules/.launcher-install-stamp"

    if [[ ! -d "$RUNTIME_DIR/node_modules" || ! -f "$stamp_file" || "$RUNTIME_DIR/package-lock.json" -nt "$stamp_file" || "$RUNTIME_DIR/package.json" -nt "$stamp_file" ]]; then
        print "Installing dependencies..."
        (
            cd "$RUNTIME_DIR"
            "$NODE_BIN" "$npm_cli" install --no-fund --no-audit
        )
        mkdir -p "${stamp_file:h}"
        touch "$stamp_file"
    fi
}

function build_runtime() {
    print "Building client and server assets..."
    (
        cd "$RUNTIME_DIR"
        "$NODE_BIN" ./node_modules/gulp/bin/gulp.js dev
    )
}

if test_local_url; then
    open_game_url
    exit 0
fi

mkdir -p "$RUNTIME_BASE" "$STATE_DIR/audit" "$CACHE_DIR" "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

print "Preparing Agar.io Clone launcher..."
print "Source repo: $REPO_ROOT"
print "Runtime copy: $RUNTIME_DIR"
print "Runtime state: $STATE_DIR"

npm_cli="$(ensure_npm_cli)"
sync_runtime
ensure_dependencies "$npm_cli"
build_runtime

(
    deadline=$(( $(current_epoch_seconds) + STARTUP_TIMEOUT_SECONDS ))
    while true; do
        now="$(current_epoch_seconds)"
        if (( now >= deadline )); then
            break
        fi

        if test_local_url; then
            open_game_url
            exit 0
        fi
        sleep 1
    done

    print -u2 "Timed out waiting for $URL"
) &

print "Starting server on $URL ..."
cd "$RUNTIME_DIR"
export MEMORY_DB_PATH="${MEMORY_DB_PATH:-$STATE_DIR/memory.db}"
export LLM_AUDIT_DIR="${LLM_AUDIT_DIR:-$STATE_DIR/audit}"
exec "$NODE_BIN" dist/server/server.js
