#!/bin/zsh
set -euo pipefail

LABEL="local.agario-clone.debug-server"
PLIST_PATH="${HOME}/Library/LaunchAgents/${LABEL}.plist"
RUNNER_PATH="${HOME}/Library/Application Support/AgarioClone/debug-server-launchd.sh"
UID_VALUE="$(id -u)"

if launchctl print "gui/${UID_VALUE}/${LABEL}" >/dev/null 2>&1; then
    launchctl bootout "gui/${UID_VALUE}/${LABEL}" >/dev/null 2>&1 || true
fi

rm -f "$PLIST_PATH"
rm -f "$RUNNER_PATH"
print "Uninstalled ${LABEL}"
