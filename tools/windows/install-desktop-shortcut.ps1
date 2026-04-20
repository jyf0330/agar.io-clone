[CmdletBinding()]
param(
    [string]$ShortcutName = 'Agar.io Clone Launcher.lnk'
)

$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptRoot)
$launcherScript = Join-Path $scriptRoot 'launch-agario.ps1'
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath $ShortcutName
$powershellPath = (Get-Command powershell.exe).Source

if (-not (Test-Path -LiteralPath $launcherScript)) {
    throw "Missing launcher script at $launcherScript"
}

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershellPath
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcherScript`""
$shortcut.WorkingDirectory = $repoRoot
$shortcut.Description = 'Start Agar.io Clone locally and open the browser.'
$shortcut.IconLocation = $powershellPath
$shortcut.WindowStyle = 1
$shortcut.Save()

Write-Output $shortcutPath
