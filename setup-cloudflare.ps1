#Requires -Version 5.1
# One-time interactive setup for deploying navee-ble-flash to Cloudflare Pages
# via Wrangler. Only covers the parts that need a human clicking a real
# browser -- everything else (build/verify/deploy) is a normal CLI command
# run afterward.

$ErrorActionPreference = "Stop"
$ProjectDir = "C:\Users\exech1\Desktop\navee-ble-flash"
$TotalStages = 3
$StageIndex = 0

function Write-Banner($title) {
  Clear-Host
  Write-Host ""
  Write-Host "  $title" -ForegroundColor Cyan
  Write-Host "  $TotalStages stages" -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "  You drive the browser; this script tells you exactly what to do and" -ForegroundColor DarkGray
  Write-Host "  waits for you to confirm each step. Stop any time with Ctrl-C and" -ForegroundColor DarkGray
  Write-Host "  re-run later." -ForegroundColor DarkGray
  Read-Host "  Ready to start? Press Enter" | Out-Null
}

function Write-Stage($name) {
  Clear-Host
  $script:StageIndex++
  Write-Host ""
  Write-Host "  > Stage $StageIndex/$TotalStages - $name" -ForegroundColor Cyan
}

function Say($msg)  { Write-Host "  $msg" }
function Step($msg) { Write-Host "  * $msg" -ForegroundColor Blue }
function Note($msg) { Write-Host "  $msg" -ForegroundColor DarkGray }
function Warn($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }

function Open-Url($url) {
  Write-Host "  -> opening $url" -ForegroundColor Green
  try { Start-Process $url | Out-Null } catch { Warn "couldn't open a browser; visit it manually: $url" }
}

function Confirm-Prompt($question) {
  $reply = Read-Host "  ? $question [y/N]"
  return $reply -match '^[Yy]'
}

# -- Stage 1: Cloudflare account ---------------------------------------------
Write-Banner "Cloudflare Pages: connect Wrangler CLI"

Write-Stage "Cloudflare account"
Say "navee-ble-flash will deploy to Cloudflare Pages, free tier -- no card needed."
Open-Url "https://dash.cloudflare.com/sign-up"
Step "Sign up if you don't have an account yet, or just log in if you do."
Step "Once you're looking at the Cloudflare dashboard, come back here."
if (-not (Confirm-Prompt "Are you logged into the Cloudflare dashboard in your browser?")) {
  Warn "come back and re-run this script once you're logged in."
  exit 1
}

# -- Stage 2: Authenticate the Wrangler CLI ----------------------------------
Write-Stage "Authenticate Wrangler CLI"
Say "This runs 'wrangler login', which opens a browser tab asking you to"
Say "approve CLI access to your Cloudflare account."
Step "Click 'Allow' in the browser tab that opens."
Note "(if a tab doesn't open automatically, wrangler prints a URL below to open by hand)"
Read-Host "  Press Enter to launch the login flow" | Out-Null

Push-Location $ProjectDir
try {
  npx wrangler login
  $loginExit = $LASTEXITCODE
} finally {
  Pop-Location
}
if ($loginExit -ne 0) {
  Warn "wrangler login did not finish cleanly."
  if (-not (Confirm-Prompt "Did the terminal output still say 'Successfully logged in'?")) {
    Warn "re-run this script to try again: .\setup-cloudflare.ps1"
    exit 1
  }
}

# -- Stage 3: Verify ----------------------------------------------------------
Write-Stage "Verify login"
Say "Checking which Cloudflare account Wrangler is now using:"
Write-Host ""
Push-Location $ProjectDir
try {
  npx wrangler whoami
  $whoamiExit = $LASTEXITCODE
} finally {
  Pop-Location
}
if ($whoamiExit -eq 0) {
  Write-Host ""
  if (-not (Confirm-Prompt "Does that show the Cloudflare account/email you expect?")) {
    Warn "run 'npx wrangler logout' then re-run this script to switch accounts."
    exit 1
  }
} else {
  Warn "wrangler whoami failed -- login likely didn't complete. Re-run this script."
  exit 1
}

Clear-Host
Write-Host ""
Write-Host "  Setup complete" -ForegroundColor Green
Write-Host ""
Note "Login is stored in Wrangler's own config, not this project -- nothing to"
Note "commit or hand back. Tell your coding assistant you're logged in and it"
Note "will run 'npm run deploy' from here (build -> verify -> deploy)."
Write-Host ""
