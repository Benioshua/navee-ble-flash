# navee-ble-flash

Real Web Bluetooth central for the Navee BLE/DFU protocol — auth, a DFU
dry-run (handshake only, no flash write), full firmware flashing, and a
live settings panel (speed mode, lock, cruise, lights, TCS, speed limits).

Deployed via GitHub Pages at https://benioshua.github.io/navee-ble-flash/
(served from `master` branch, `/` path).

## Standing instructions

- This repo is **public** by deliberate choice — it contains the real
  Navee AES/XOR auth key table and the full reverse-engineered BLE
  protocol. Don't add anything more sensitive than that without checking
  first (no vendor firmware binaries, no APKs, no account credentials).
- **Auto-commit and push after making changes here** — no need to ask
  each time, per standing user instruction (2026-09-06). Still write a
  clear commit message describing what changed and why.
- The file GitHub Pages actually serves must always be named
  **`index.html`** at the repo root — that's the entry point Pages looks
  for by default. Never rename it or add a build step that outputs
  somewhere else without also updating the Pages source config.
- This is a single-file tool (`index.html`, self-contained HTML/CSS/JS,
  no build step, no dependencies). Keep it that way unless asked
  otherwise — it needs to run unmodified from a Bluefy (iOS) or Chromium
  browser tab with nothing else to install.
- The broader Navee/Segway/Xiaomi reverse-engineering project this tool
  came from lives in a separate, non-git folder
  (`C:\Users\exech1\Desktop\Segway`, notes in `Info.md`) — this repo only
  ever tracks the flash/recon web tool itself, not the RE research
  materials or any vendor binaries.
