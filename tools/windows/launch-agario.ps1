[CmdletBinding()]
param(
    [string]$Url = 'http://127.0.0.1:3000',
    [int]$StartupTimeoutSeconds = 60,
    [switch]$SkipBrowser
)

$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptRoot)
$serverScript = Join-Path $scriptRoot 'run-server.ps1'

function Test-LocalUrl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TargetUrl
    )

    try {
        $response = Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Open-GameUrl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TargetUrl
    )

    if (-not $SkipBrowser) {
        Start-Process $TargetUrl | Out-Null
    }
}

if (-not (Test-Path -LiteralPath $serverScript)) {
    throw "Missing server script at $serverScript"
}

if (Test-LocalUrl -TargetUrl $Url) {
    Open-GameUrl -TargetUrl $Url
    return
}

Start-Process -FilePath (Get-Command powershell.exe).Source `
    -ArgumentList @(
        '-NoExit',
        '-ExecutionPolicy', 'Bypass',
        '-File', $serverScript
    ) `
    -WorkingDirectory $repoRoot | Out-Null

$deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)

while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 1
    if (Test-LocalUrl -TargetUrl $Url) {
        Open-GameUrl -TargetUrl $Url
        return
    }
}

throw "Agar.io Clone did not become available at $Url within $StartupTimeoutSeconds seconds."
