#!/bin/zsh
set -euo pipefail

SCRIPT_ROOT="${0:A:h}"
LAUNCHER_SCRIPT="${SCRIPT_ROOT}/launch-agario.sh"
DESKTOP_SHORTCUT="${HOME}/Desktop/Agar.io Clone Launcher.command"

if [[ ! -x "$LAUNCHER_SCRIPT" ]]; then
    print -u2 "Missing launcher script at $LAUNCHER_SCRIPT"
    exit 1
fi

cat > "$DESKTOP_SHORTCUT" <<EOF
#!/bin/zsh
exec "$LAUNCHER_SCRIPT"
EOF

chmod +x "$DESKTOP_SHORTCUT"
print -- "$DESKTOP_SHORTCUT"
