#!/bin/zsh
set -euo pipefail

SCRIPT_ROOT="${0:A:h}"
LAUNCHER_SCRIPT="${SCRIPT_ROOT}/launch-agario.sh"
DESKTOP_DIR="${HOME}/Desktop"
DESKTOP_SHORTCUT="${DESKTOP_DIR}/Agar.io Clone Launcher.command"
CHINESE_SHORTCUT="${DESKTOP_DIR}/开放吞噬一键启动.command"
DESKTOP_APP="${DESKTOP_DIR}/开放吞噬启动.app"

if [[ ! -x "$LAUNCHER_SCRIPT" ]]; then
    print -u2 "Missing launcher script at $LAUNCHER_SCRIPT"
    exit 1
fi

mkdir -p "$DESKTOP_DIR"

write_command_shortcut() {
    local target="$1"

    cat > "$target" <<EOF
#!/bin/zsh
exec /bin/zsh "$LAUNCHER_SCRIPT"
EOF
    chmod +x "$target"
    xattr -c "$target" 2>/dev/null || true
}

write_command_shortcut "$DESKTOP_SHORTCUT"
write_command_shortcut "$CHINESE_SHORTCUT"
rm -rf "$DESKTOP_APP"

print -- "$DESKTOP_SHORTCUT"
print -- "$CHINESE_SHORTCUT"
print -- "Removed stale app launcher: $DESKTOP_APP"
