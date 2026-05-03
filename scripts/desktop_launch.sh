#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_REPO_ROOT="${AGAR_SOURCE_ROOT:-$REPO_ROOT}"
RUNTIME_ROOT="${AGAR_RUNTIME_ROOT:-$HOME/Library/Application Support/AgarioClone/runtime}"
HOST="${AGAR_DESKTOP_HOST:-127.0.0.1}"
DEFAULT_PORT="${AGAR_DESKTOP_PORT:-3000}"
LOG_DIR="$REPO_ROOT/.launcher"
LOG_FILE="$LOG_DIR/server.log"
PID_FILE="$LOG_DIR/server.pid"
PORT_FILE="$LOG_DIR/server.port"
STATE_DIR="$LOG_DIR/state"

mkdir -p "$LOG_DIR" "$STATE_DIR/audit"
cd "$REPO_ROOT"

candidate_ports=("$DEFAULT_PORT" "3060" "3061" "3062")

resolve_node_bin() {
    local candidate

    if [[ -n "${AGAR_NODE_BIN:-}" && -x "$AGAR_NODE_BIN" ]]; then
        echo "$AGAR_NODE_BIN"
        return 0
    fi

    for candidate in "$(command -v node || true)" "/opt/homebrew/bin/node" "/usr/local/bin/node" "/Applications/Codex.app/Contents/Resources/node"; do
        if [[ -n "$candidate" && -x "$candidate" ]]; then
            echo "$candidate"
            return 0
        fi
    done

    return 1
}

is_port_listening() {
    local port="$1"
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

listener_pids() {
    local port="$1"
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

project_listener_pid() {
    local port="$1"
    local pid

    while read -r pid; do
        if [[ -n "$pid" ]] && is_project_server_pid "$pid"; then
            echo "$pid"
            return 0
        fi
    done < <(listener_pids "$port")

    return 1
}

is_project_server_pid() {
    local pid="$1"
    local command_line
    local cwd

    command_line="$(ps -p "$pid" -o command= 2>/dev/null || true)"
    cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1)"

    [[ "$command_line" == *"dist/server/server.js"* ]] && {
        [[ "$cwd" == "$REPO_ROOT"* || "$cwd" == "$SOURCE_REPO_ROOT"* || "$cwd" == "$RUNTIME_ROOT"* ]]
    }
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

stop_pid() {
    local pid="$1"
    local attempt

    if ! kill -0 "$pid" >/dev/null 2>&1; then
        return 0
    fi

    echo "Stopping existing game server PID $pid"
    kill "$pid" >/dev/null 2>&1 || true

    for attempt in $(seq 1 20); do
        if ! kill -0 "$pid" >/dev/null 2>&1; then
            return 0
        fi
        sleep 0.2
    done

    echo "Force stopping existing game server PID $pid"
    kill -9 "$pid" >/dev/null 2>&1 || true
}

stop_existing_game_servers() {
    local port
    local pid
    local attempt
    local still_running

    cleanup_stale_pid

    if [[ -f "$PID_FILE" ]]; then
        pid="$(cat "$PID_FILE")"
        if [[ -n "$pid" ]] && is_project_server_pid "$pid"; then
            stop_pid "$pid"
        fi
        rm -f "$PID_FILE"
    fi

    for port in "${candidate_ports[@]}"; do
        while read -r pid; do
            if [[ -n "$pid" ]] && is_project_server_pid "$pid"; then
                stop_pid "$pid"
            fi
        done < <(listener_pids "$port")
    done

    for attempt in $(seq 1 20); do
        still_running=0
        for port in "${candidate_ports[@]}"; do
            while read -r pid; do
                if [[ -n "$pid" ]] && is_project_server_pid "$pid"; then
                    still_running=1
                fi
            done < <(listener_pids "$port")
        done

        if [[ "$still_running" -eq 0 ]]; then
            return 0
        fi

        sleep 0.2
    done
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
            if ! project_listener_pid "$port" >/dev/null; then
                return 1
            fi
        fi

        sleep 1
    done

    return 1
}

cleanup_stale_pid

stop_existing_game_servers

if [[ ! -x "./node_modules/gulp/bin/gulp.js" ]]; then
    echo "Missing ./node_modules/gulp/bin/gulp.js"
    echo "Run npm install in:"
    echo "  $REPO_ROOT"
    exit 1
fi

if ! NODE_BIN="$(resolve_node_bin)"; then
    echo "Unable to find Node.js for the desktop launcher."
    echo "Install Node.js or set AGAR_NODE_BIN to the node executable path."
    exit 127
fi
export PATH="$(dirname "$NODE_BIN"):$PATH"

if ! launch_port="$(find_free_port)"; then
    echo "No free launcher port found in: ${candidate_ports[*]}"
    exit 1
fi

echo "Preparing launcher build..."
# The desktop launcher only needs runnable client/server assets.
# Avoid blocking startup on unrelated red tests in a dirty worktree.
"$NODE_BIN" ./node_modules/gulp/bin/gulp.js dev

if [[ ! -f "./dist/server/server.js" ]]; then
    echo "Build finished but dist/server/server.js is missing."
    exit 1
fi

echo "Starting server on http://$HOST:$launch_port/"
echo "Logs: $LOG_FILE"
nohup env \
    PORT="$launch_port" \
    IP="$HOST" \
    MEMORY_DB_PATH="${MEMORY_DB_PATH:-$STATE_DIR/memory.db}" \
    LLM_AUDIT_DIR="${LLM_AUDIT_DIR:-$STATE_DIR/audit}" \
    "$NODE_BIN" ./dist/server/server.js >>"$LOG_FILE" 2>&1 &
server_pid="$!"

echo "$server_pid" > "$PID_FILE"
echo "$launch_port" > "$PORT_FILE"

if wait_for_server "$launch_port" "$server_pid"; then
    if actual_pid="$(project_listener_pid "$launch_port")"; then
        server_pid="$actual_pid"
        echo "$server_pid" > "$PID_FILE"
    fi
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
