import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SakuraPetals } from "@/components/SakuraPetals";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Cherry, Download, Copy, Check, Terminal, ArrowLeft, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

const APP_URL = "https://aikalabs.lovable.app";

const PS_SCRIPT = `# Aika-AI Desktop Installer
# Installs Aika-AI as a standalone desktop app using Microsoft Edge / Chrome
# Run in PowerShell:  iwr -useb https://aikalabs.lovable.app/install.ps1 | iex
# Or save this file and run:  powershell -ExecutionPolicy Bypass -File install-aika.ps1

$ErrorActionPreference = 'Stop'
$AppName  = 'Aika-AI'
$AppUrl   = '${APP_URL}'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Aika-AI'
$IconPath = Join-Path $InstallDir 'aika.ico'

Write-Host ''
Write-Host '  Aika-AI Installer ' -ForegroundColor Magenta -NoNewline
Write-Host 'cherry blossoms loading...' -ForegroundColor DarkGray
Write-Host ''

# 1. Find a Chromium browser (Edge preferred, then Chrome, then Brave)
$browserCandidates = @(
  "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe",
  "\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe",
  "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe",
  "\${env:ProgramFiles(x86)}\\Google\\Chrome\\Application\\chrome.exe",
  "$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe",
  "$env:ProgramFiles\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
) | ForEach-Object { \$ExecutionContext.InvokeCommand.ExpandString(\$_) }

$Browser = $browserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Browser) {
  Write-Host 'No supported browser found. Install Microsoft Edge or Google Chrome first.' -ForegroundColor Red
  exit 1
}
Write-Host "Using browser: $Browser" -ForegroundColor DarkGray

# 2. Prepare install directory
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# 3. Download icon (falls back to browser favicon if site icon missing)
try {
  $iconUrl = "$AppUrl/favicon.ico"
  Invoke-WebRequest -Uri $iconUrl -OutFile $IconPath -UseBasicParsing
  Write-Host 'Icon downloaded.' -ForegroundColor DarkGray
} catch {
  Write-Host 'Could not fetch app icon, using browser default.' -ForegroundColor Yellow
  $IconPath = $Browser
}

# 4. Create shortcut (Desktop + Start Menu)
function New-AikaShortcut($Path) {
  $shell = New-Object -ComObject WScript.Shell
  $sc = $shell.CreateShortcut($Path)
  $sc.TargetPath = $Browser
  $sc.Arguments  = "--app=$AppUrl --user-data-dir=\`"$InstallDir\\profile\`""
  $sc.IconLocation = $IconPath
  $sc.WorkingDirectory = $InstallDir
  $sc.Description = 'Aika-AI - your anime-themed AI assistant'
  $sc.Save()
}

$desktop   = [Environment]::GetFolderPath('Desktop')
$startMenu = [Environment]::GetFolderPath('Programs')
$desktopLnk = Join-Path $desktop   "$AppName.lnk"
$startLnk   = Join-Path $startMenu "$AppName.lnk"

New-AikaShortcut $desktopLnk
New-AikaShortcut $startLnk

Write-Host ''
Write-Host 'Aika-AI installed!' -ForegroundColor Green
Write-Host "  Desktop:    $desktopLnk" -ForegroundColor DarkGray
Write-Host "  Start Menu: $startLnk"   -ForegroundColor DarkGray
Write-Host ''

# 5. Offer to launch
$launch = Read-Host 'Launch Aika-AI now? (Y/n)'
if ($launch -ne 'n' -and $launch -ne 'N') {
  Start-Process -FilePath $Browser -ArgumentList "--app=$AppUrl","--user-data-dir=\`"$InstallDir\\profile\`""
}
`;

const ONE_LINER = `powershell -ExecutionPolicy Bypass -Command "iwr -useb https://aikalabs.lovable.app/install.ps1 | iex"`;

export default function Install() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 1800);
  };

  const downloadScript = () => {
    const blob = new Blob([PS_SCRIPT], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "install-aika.ps1";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("install-aika.ps1 downloaded");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SakuraPetals count={12} />

      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Cherry className="h-6 w-6 text-primary" />
          <span className="font-display text-xl text-primary">Aika-AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Home
            </Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-20">
        <header className="text-center pt-8 pb-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-2 ring-primary/20">
            <Terminal className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Install <span className="text-primary">Aika-AI</span> on Windows
          </h1>
          <p className="mt-3 text-muted-foreground">
            One PowerShell command turns Aika into a real desktop app with its own window, Start Menu entry, and Desktop shortcut.
          </p>
        </header>

        {/* What it does */}
        <div className="grid gap-3 sm:grid-cols-3 mb-8">
          {[
            { icon: Zap, t: "Standalone window", d: "Runs in its own app frame via Edge/Chrome --app mode." },
            { icon: Shield, t: "Safe & local", d: "No admin rights. Installs only to your user profile." },
            { icon: Cherry, t: "Real shortcut", d: "Adds Aika to Desktop and Start Menu with its icon." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm">
              <f.icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-medium text-foreground">{f.t}</p>
              <p className="text-xs text-muted-foreground mt-1">{f.d}</p>
            </div>
          ))}
        </div>

        {/* Step 1: one-liner */}
        <section className="space-y-3 mb-8">
          <h2 className="font-display text-lg text-foreground">
            Option 1 — One-line install (recommended)
          </h2>
          <p className="text-sm text-muted-foreground">
            Open <span className="font-mono text-primary">PowerShell</span> (press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Win</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">R</kbd>, type <code className="font-mono">powershell</code>, Enter) and paste:
          </p>
          <div className="relative group">
            <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 pr-14 text-xs text-foreground font-mono">
              {ONE_LINER}
            </pre>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => copy(ONE_LINER, "oneliner")}
            >
              {copied === "oneliner" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </section>

        {/* Step 2: download */}
        <section className="space-y-3 mb-8">
          <h2 className="font-display text-lg text-foreground">
            Option 2 — Download the script
          </h2>
          <p className="text-sm text-muted-foreground">
            Prefer to read the script first? Download it, right-click and choose <span className="font-medium text-foreground">Run with PowerShell</span>.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={downloadScript} className="gap-2">
              <Download className="h-4 w-4" /> Download install-aika.ps1
            </Button>
            <Button variant="outline" onClick={() => copy(PS_SCRIPT, "full")} className="gap-2">
              {copied === "full" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              Copy full script
            </Button>
          </div>
          <details className="mt-2 rounded-xl border border-border bg-card/60 overflow-hidden">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40">
              Show script source
            </summary>
            <pre className="overflow-x-auto border-t border-border bg-card p-4 text-xs text-foreground font-mono leading-relaxed max-h-96">
              {PS_SCRIPT}
            </pre>
          </details>
        </section>

        {/* Notes */}
        <section className="rounded-xl border border-border bg-card/60 p-5 text-sm text-muted-foreground space-y-2 backdrop-blur-sm">
          <p className="font-medium text-foreground">Requirements</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Windows 10 or 11</li>
            <li>Microsoft Edge (pre-installed) or Google Chrome</li>
            <li>Internet connection on first launch</li>
          </ul>
          <p className="pt-2">
            To uninstall: delete the <code className="font-mono text-foreground">Aika-AI</code> shortcuts from Desktop and Start Menu, and remove <code className="font-mono text-foreground">%LOCALAPPDATA%\Aika-AI</code>.
          </p>
        </section>
      </main>
    </div>
  );
}
