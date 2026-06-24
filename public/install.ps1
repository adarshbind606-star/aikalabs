# Aika-AI Installer
# Creates a desktop + Start Menu shortcut that launches Aika-AI as a standalone app window.
# Usage:  irm https://aikalabs.lovable.app/install.ps1 | iex

$ErrorActionPreference = 'Stop'

$AppName  = 'Aika-AI'
$AppUrl   = 'https://aikalabs.lovable.app'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Aika-AI'
$IconPath = Join-Path $InstallDir 'aika.ico'

function Write-Step($msg) {
    Write-Host "  >> $msg" -ForegroundColor Magenta
}

Write-Host ""
Write-Host "  ===== Aika-AI Installer =====" -ForegroundColor Magenta
Write-Host ""

# 1. Prepare install dir
Write-Step "Preparing install folder: $InstallDir"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# 2. Download favicon as icon
Write-Step "Downloading app icon..."
try {
    Invoke-WebRequest -Uri "$AppUrl/favicon.ico" -OutFile $IconPath -UseBasicParsing
} catch {
    Write-Host "  (icon download failed, using default browser icon)" -ForegroundColor Yellow
    $IconPath = $null
}

# 3. Detect a Chromium browser that supports --app=
Write-Step "Looking for a compatible browser (Edge / Chrome / Brave)..."
$candidates = @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
    "${env:ProgramFiles(x86)}\BraveSoftware\Brave-Browser\Application\brave.exe"
)
$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) {
    throw "No Chromium-based browser found. Please install Microsoft Edge, Google Chrome, or Brave and re-run."
}
Write-Host "     Using: $browser" -ForegroundColor DarkGray

# 4. Build shortcuts (Desktop + Start Menu)
$WScript = New-Object -ComObject WScript.Shell
$desktop  = [Environment]::GetFolderPath('Desktop')
$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$targets = @(
    (Join-Path $desktop  "$AppName.lnk"),
    (Join-Path $startMenu "$AppName.lnk")
)

foreach ($lnk in $targets) {
    Write-Step "Creating shortcut: $lnk"
    $s = $WScript.CreateShortcut($lnk)
    $s.TargetPath       = $browser
    $s.Arguments        = "--app=$AppUrl --new-window"
    $s.WorkingDirectory = Split-Path $browser
    $s.WindowStyle      = 1
    $s.Description      = 'Aika-AI — anime-inspired AI assistant'
    if ($IconPath -and (Test-Path $IconPath)) {
        $s.IconLocation = $IconPath
    }
    $s.Save()
}

# 5. Register uninstall entry
Write-Step "Registering in Apps & Features..."
$regPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\AikaAI'
New-Item -Path $regPath -Force | Out-Null
New-ItemProperty -Path $regPath -Name 'DisplayName'     -Value $AppName -PropertyType String -Force | Out-Null
New-ItemProperty -Path $regPath -Name 'DisplayVersion'  -Value '2.1'    -PropertyType String -Force | Out-Null
New-ItemProperty -Path $regPath -Name 'Publisher'       -Value 'Aika Labs' -PropertyType String -Force | Out-Null
New-ItemProperty -Path $regPath -Name 'InstallLocation' -Value $InstallDir -PropertyType String -Force | Out-Null
if ($IconPath) {
    New-ItemProperty -Path $regPath -Name 'DisplayIcon' -Value $IconPath -PropertyType String -Force | Out-Null
}
New-ItemProperty -Path $regPath -Name 'UninstallString' -Value "powershell -NoProfile -ExecutionPolicy Bypass -Command `"Remove-Item '$desktop\$AppName.lnk','$startMenu\$AppName.lnk','$InstallDir' -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item '$regPath' -Recurse -Force`"" -PropertyType String -Force | Out-Null

Write-Host ""
Write-Host "  Aika-AI installed successfully!" -ForegroundColor Green
Write-Host "  Look for the shortcut on your Desktop or Start Menu." -ForegroundColor Green
Write-Host ""