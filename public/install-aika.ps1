# ============================================================
#  Aika AI - Windows Installer (PowerShell)
#  Installs Aika AI 2.1 as a standalone desktop app (PWA)
#  Run with:  iwr -useb https://aikalabs.lovable.app/install-aika.ps1 | iex
# ============================================================

$ErrorActionPreference = "Stop"

$AppName    = "Aika AI"
$AppId      = "AikaAI"
$AppUrl     = "https://aikalabs.lovable.app"
$IconUrl    = "$AppUrl/favicon.ico"
$InstallDir = Join-Path $env:LOCALAPPDATA $AppId
$IconPath   = Join-Path $InstallDir "aika.ico"
$LauncherPs = Join-Path $InstallDir "Aika.ps1"
$LauncherCmd= Join-Path $InstallDir "Aika.cmd"
$Uninstall  = Join-Path $InstallDir "Uninstall.ps1"

function Write-Step($msg) { Write-Host "  $msg" -ForegroundColor Magenta }
function Write-Ok($msg)   { Write-Host "  $msg" -ForegroundColor Green   }
function Write-Warn2($m)  { Write-Host "  $m"   -ForegroundColor Yellow  }

Clear-Host
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Magenta
Write-Host "             Aika AI - Installer            " -ForegroundColor White
Write-Host "        Cherry-blossom AI for Windows         " -ForegroundColor Magenta
Write-Host "  ============================================" -ForegroundColor Magenta
Write-Host ""

# ---- 1. Detect a Chromium browser to host the app window ----
Write-Step "Looking for a compatible browser (Edge / Chrome / Brave)..."

$browserCandidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
    "${env:ProgramFiles(x86)}\BraveSoftware\Brave-Browser\Application\brave.exe"
)

$Browser = $browserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $Browser) {
    Write-Warn2 "No Chromium browser found. Please install Microsoft Edge or Google Chrome."
    Write-Host "  Opening download page..." -ForegroundColor Yellow
    Start-Process "https://www.microsoft.com/edge"
    exit 1
}
Write-Ok "Found browser: $Browser"

# ---- 2. Create install directory ----
Write-Step "Creating install directory at $InstallDir ..."
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# ---- 3. Download icon ----
Write-Step "Downloading Aika icon..."
try {
    Invoke-WebRequest -Uri $IconUrl -OutFile $IconPath -UseBasicParsing
    Write-Ok "Icon saved."
} catch {
    Write-Warn2 "Could not download icon (will use default)."
    $IconPath = $Browser
}

# ---- 4. Write launcher scripts ----
Write-Step "Writing launcher..."

$userDataDir = Join-Path $InstallDir "profile"
New-Item -ItemType Directory -Force -Path $userDataDir | Out-Null

$psLauncher = @"
# Aika AI launcher
`$browser = "$Browser"
`$args = @(
    "--app=$AppUrl",
    "--user-data-dir=$userDataDir",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=msEdgeSidebar,msImplicitSignin"
)
Start-Process -FilePath `$browser -ArgumentList `$args
"@
Set-Content -Path $LauncherPs -Value $psLauncher -Encoding UTF8

$cmdLauncher = "@echo off`r`nstart `"`" `"$Browser`" --app=$AppUrl --user-data-dir=`"$userDataDir`" --no-first-run --no-default-browser-check"
Set-Content -Path $LauncherCmd -Value $cmdLauncher -Encoding ASCII

Write-Ok "Launcher written."

# ---- 5. Create Start Menu + Desktop shortcuts ----
Write-Step "Creating shortcuts..."

function New-Shortcut($lnkPath, $target, $args, $icon, $workdir) {
    $wsh = New-Object -ComObject WScript.Shell
    $sc  = $wsh.CreateShortcut($lnkPath)
    $sc.TargetPath       = $target
    $sc.Arguments        = $args
    $sc.IconLocation     = $icon
    $sc.WorkingDirectory = $workdir
    $sc.Description      = "Aika AI - your cherry-blossom AI companion"
    $sc.Save()
}

$shortcutArgs = "--app=$AppUrl --user-data-dir=`"$userDataDir`" --no-first-run --no-default-browser-check"

$desktopLnk   = Join-Path ([Environment]::GetFolderPath("Desktop")) "$AppName.lnk"
$startMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$startLnk     = Join-Path $startMenuDir "$AppName.lnk"

New-Shortcut $desktopLnk $Browser $shortcutArgs $IconPath $InstallDir
New-Shortcut $startLnk   $Browser $shortcutArgs $IconPath $InstallDir
Write-Ok "Shortcuts created on Desktop and Start Menu."

# ---- 6. Register uninstaller in Add/Remove Programs ----
Write-Step "Registering with Windows..."

$uninstallScript = @"
Write-Host 'Uninstalling Aika AI...' -ForegroundColor Magenta
Remove-Item -Path '$desktopLnk' -Force -ErrorAction SilentlyContinue
Remove-Item -Path '$startLnk'   -Force -ErrorAction SilentlyContinue
Remove-Item -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$AppId' -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Remove-Item -Path '$InstallDir' -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'Aika AI has been removed.' -ForegroundColor Green
"@
Set-Content -Path $Uninstall -Value $uninstallScript -Encoding UTF8

$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$AppId"
New-Item -Path $regPath -Force | Out-Null
New-ItemProperty -Path $regPath -Name "DisplayName"     -Value $AppName -PropertyType String -Force | Out-Null
New-ItemProperty -Path $regPath -Name "DisplayIcon"     -Value $IconPath -PropertyType String -Force | Out-Null
New-ItemProperty -Path $regPath -Name "DisplayVersion"  -Value "2.1.0"  -PropertyType String -Force | Out-Null
New-ItemProperty -Path $regPath -Name "Publisher"       -Value "Aika Labs" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $regPath -Name "InstallLocation" -Value $InstallDir -PropertyType String -Force | Out-Null
New-ItemProperty -Path $regPath -Name "UninstallString" -Value "powershell.exe -ExecutionPolicy Bypass -File `"$Uninstall`"" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $regPath -Name "NoModify"        -Value 1 -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $regPath -Name "NoRepair"        -Value 1 -PropertyType DWord -Force | Out-Null
Write-Ok "Registered. You can uninstall from Settings > Apps."

# ---- 7. Done ----
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Magenta
Write-Ok   "  Aika AI installed successfully!"
Write-Host "  ============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Launch from your Desktop or Start Menu." -ForegroundColor White
Write-Host ""

$launchNow = Read-Host "  Launch Aika AI now? (Y/N)"
if ($launchNow -match '^[Yy]') {
    Start-Process -FilePath $Browser -ArgumentList "--app=$AppUrl","--user-data-dir=$userDataDir","--no-first-run","--no-default-browser-check"
}
