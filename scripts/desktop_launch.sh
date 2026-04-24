#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOST="${AGAR_DESKTOP_HOST:-127.0.0.1}"
DEFAULT_PORT="${AGAR_DESKTOP_PORT:-3000}"
LOG_DIR="$REPO_ROOT/.launcher"
LOG_FILE="$LOG_DIR/server.log"
PID_FILE="$LOG_DIR/server.pid"
PORT_FILE="$LOG_DIR/server.port"

mkdir -p "$LOG_DIR"
cd "$REPO_ROOT"

candidate_ports=("$DEFAULT_PORT" "3060" "3061" "3062")

is_port_listening() {
    local port="$1"
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

is_game_ready() {
    local port="$1"
    local url="http://$HOST:$port/"
    curl -fsSL --max-time 2 "$url" 2>/dev/null | grep -q 'js/app.js'
}

open_game() {
    local port="$1"
    local url="http://$HOST:$port/"
    echo "Opening $url"
    open "$url"
}

cleanup_stale_pid() {
    if [[ -f "$PID_FILE" ]]; then
        local existing_pid
        existing_pid="$(cat "$PID_FILE")"
        if [[ -z "$existing_pid" ]] || ! kill -0 "$existing_pid" >/dev/null 2>&1; then
            rm -f "$PID_FILE"
        fi
    fi
}

find_running_game() {
    local port
    for port in "${candidate_ports[@]}"; do
        if is_game_ready "$port"; then
            echo "$port"
            return 0
        fi
    done
    return 1
}

find_free_port() {
    local port
    for port in "${candidate_ports[@]}"; do
        if ! is_port_listening "$port"; then
            echo "$port"
            return 0
        fi
    done
    return 1
}

wait_for_server() {
    local port="$1"
    local pid="$2"
    local attempt

    for attempt in $(seq 1 60); do
        if is_game_ready "$port"; then
            return 0
        fi

        if ! kill -0 "$pid" >/dev/null 2>&1; then
            return 1
        fi

        sleep 1
    done

    return 1
}

cleanup_stale_pid

if running_port="$(find_running_game)"; then
    echo "Game server already available on http://$HOST:$running_port/"
    echo "$running_port" > "$PORT_FILE"
    open_game "$running_port"
    exit 0
fi

if [[ ! -x "./node_modules/gulp/bin/gulp.js" ]]; then
    echo "Missing ./node_modules/gulp/bin/gulp.js"
    echo "Run npm install in:"
    echo "  $REPO_ROOT"
    exit 1
fi

if ! launch_port="$(find_free_port)"; then
    echo "No free launcher port found in: ${candidate_ports[*]}"
    exit 1
fi

echo "Preparing launcher build..."
# The desktop launcher only needs runnable client/server assets.
# Avoid blocking startup on unrelated red tests in a dirty worktree.
node ./node_modules/gulp/bin/gulp.js dev

if [[ ! -f "./dist/server/server.js" ]]; then
    echo "Build finished but dist/server/server.js is missing."
    exit 1
fi

echo "Starting server on http://$HOST:$launch_port/"
echo "Logs: $LOG_FILE"
nohup env PORT="$launch_port" IP="$HOST" node ./dist/server/server.js >>"$LOG_FILE" 2>&1 &
server_pid="$!"

echo "$server_pid" > "$PID_FILE"
echo "$launch_port" > "$PORT_FILE"

if wait_for_server "$launch_port" "$server_pid"; then
    open_game "$launch_port"
    echo
    echo "Server ready."
    echo "PID: $server_pid"
    echo "URL: http://$HOST:$launch_port/"
    exit 0
fi

echo "Server failed to become ready."
echo "Last log lines:"
tail -n 40 "$LOG_FILE" || true
exit 1
