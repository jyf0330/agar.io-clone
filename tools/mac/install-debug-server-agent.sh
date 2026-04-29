#!/bin/zsh
set -euo pipefail

LABEL="local.agario-clone.debug-server"
SCRIPT_ROOT="${0:A:h}"
REPO_ROOT="${SCRIPT_ROOT:h:h}"
RUNTIME_BASE="${HOME}/Library/Application Support/AgarioClone"
RUNNER="${RUNTIME_BASE}/debug-server-launchd.sh"
PLIST_DIR="${HOME}/Library/LaunchAgents"
PLIST_PATH="${PLIST_DIR}/${LABEL}.plist"
LOG_DIR="${REPO_ROOT}/.launcher"
UID_VALUE="$(id -u)"

mkdir -p "$PLIST_DIR" "$LOG_DIR" "$RUNTIME_BASE"
: > "${LOG_DIR}/debug-server.log"
: > "${LOG_DIR}/debug-server.err.log"

if launchctl print "gui/${UID_VALUE}/${LABEL}" >/dev/null 2>&1; then
    launchctl bootout "gui/${UID_VALUE}/${LABEL}" >/dev/null 2>&1 || true
    for _ in {1..20}; do
        if ! launchctl print "gui/${UID_VALUE}/${LABEL}" >/dev/null 2>&1; then
            break
        fi
        sleep 0.2
    done
fi

cat > "$RUNNER" <<EOF
#!/bin/zsh
set -euo pipefail

REPO_ROOT="$REPO_ROOT"
LOG_DIR="\${REPO_ROOT}/.launcher"
STATE_DIR="\${LOG_DIR}/debug-state"
DEBUG_DIST_DIR="\${LOG_DIR}/debug-dist"
PORT="\${AGAR_DEBUG_PORT:-3000}"
HOST="\${AGAR_DEBUG_HOST:-127.0.0.1}"
NODE_BIN="\${AGARIO_NODE_BIN:-\$(command -v node || true)}"

if [[ ! -x "\$NODE_BIN" ]]; then
    NODE_BIN="/Applications/Codex.app/Contents/Resources/node"
fi

if [[ -z "\${NODE_BIN:-}" || ! -x "\$NODE_BIN" ]]; then
    print -u2 "Unable to find a usable Node.js runtime."
    exit 1
fi

mkdir -p "\$LOG_DIR" "\$STATE_DIR/audit" "\$DEBUG_DIST_DIR"
cd "\$REPO_ROOT"

if [[ ! -x "./node_modules/gulp/bin/gulp.js" ]]; then
    print -u2 "Missing ./node_modules/gulp/bin/gulp.js"
    print -u2 "Run npm install in: \$REPO_ROOT"
    exit 1
fi

export PORT="\$PORT"
export HOST="\$HOST"
export IP="\$HOST"
export DIST_DIR="\$DEBUG_DIST_DIR"
export MEMORY_DB_PATH="\${MEMORY_DB_PATH:-\$STATE_DIR/memory.db}"
export LLM_AUDIT_DIR="\${LLM_AUDIT_DIR:-\$STATE_DIR/audit}"

print "Starting Agar.io Clone debug server at http://\$HOST:\$PORT/"
print "Repo: \$REPO_ROOT"
print "Build output: \$DEBUG_DIST_DIR"
print "State: \$STATE_DIR"

exec "\$NODE_BIN" ./node_modules/gulp/bin/gulp.js watch
EOF
chmod +x "$RUNNER"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/zsh</string>
        <string>${RUNNER}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>Crashed</key>
        <true/>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/debug-server.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/debug-server.err.log</string>
    <key>WorkingDirectory</key>
    <string>${RUNTIME_BASE}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>AGAR_DEBUG_HOST</key>
        <string>127.0.0.1</string>
        <key>AGAR_DEBUG_PORT</key>
        <string>3000</string>
    </dict>
</dict>
</plist>
EOF

if ! launchctl bootstrap "gui/${UID_VALUE}" "$PLIST_PATH"; then
    sleep 1
    launchctl bootout "gui/${UID_VALUE}/${LABEL}" >/dev/null 2>&1 || true
    launchctl bootstrap "gui/${UID_VALUE}" "$PLIST_PATH"
fi
launchctl kickstart -k "gui/${UID_VALUE}/${LABEL}"

print "Installed and started ${LABEL}"
print "URL: http://127.0.0.1:3000/"
print "Logs: ${LOG_DIR}/debug-server.log"
print "Errors: ${LOG_DIR}/debug-server.err.log"
