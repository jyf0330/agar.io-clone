[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptRoot)

function Convert-ToWslLocation {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if ($Path -match '^[\\]{2}wsl(?:\.localhost|\$)\\([^\\]+)\\(.+)$') {
        return [pscustomobject]@{
            Distro = $Matches[1]
            LinuxPath = '/' + (($Matches[2] -replace '\\', '/').TrimStart('/'))
        }
    }

    throw "Expected a WSL UNC path, got: $Path"
}

$wslLocation = Convert-ToWslLocation -Path $repoRoot
if ($wslLocation.LinuxPath -match "'") {
    throw "Paths containing apostrophes are not supported: $($wslLocation.LinuxPath)"
}

$bashCommand = "set -e; cd '$($wslLocation.LinuxPath)'; node ./node_modules/gulp/bin/gulp.js dev; exec node dist/server/server.js"

$host.UI.RawUI.WindowTitle = 'Agar.io Clone Server'

Write-Host "Starting Agar.io Clone from $repoRoot via WSL distro $($wslLocation.Distro)" -ForegroundColor Cyan
wsl.exe -d $wslLocation.Distro bash -lc $bashCommand
