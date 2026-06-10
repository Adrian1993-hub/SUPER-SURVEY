# /ui/src-tauri — Desktop shell (Tauri v2)

Thin desktop wrapper that connects the **TypeScript UI** to the **Rust calc kernel**
and **SQLite persistence**. It holds **no calculation logic** — every official number
comes from `supersurvey_calc`; storage from `supersurvey_persistence`.

## ⚠️ Not in CI (by design)

Building Tauri needs system libraries the kernel CI image doesn't install
(`webkit2gtk`, `libsoup`, `gtk`). So this crate is **excluded from the GitHub
Actions workflow** (which only builds `rust-kernel/**`). The math and storage it
depends on are fully tested in their own crates. **This shell is an unverified
skeleton** until built locally with the deps below.

## IPC commands (Rust → TS)

| Command | Does |
|---|---|
| `calculate_bqs_row(request)` | Pure calc (no DB). Returns the full row + trace. |
| `save_bqs_calculation(job_id, …, request)` | Calc + persist as an append-only `calculation_log`. Returns the log id. |

Both take `BqsRowRequestDTO` (string-in) and return string-out DTOs — numbers cross
the boundary as strings, parsed to `Decimal` only inside Rust.

```ts
import { invoke } from '@tauri-apps/api/core'
const res = await invoke('calculate_bqs_row', { request: { /* BqsRowRequestDTO */ } })
```

## Local build

```bash
# 1) System deps (Debian/Ubuntu)
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev \
  librsvg2-dev build-essential curl wget file libssl-dev

# 2) Tauri CLI (dev dependency of /ui)
cd ui && npm install -D @tauri-apps/cli @tauri-apps/api

# 3) Run / build
npx tauri dev      # launches Vite + the desktop window
npx tauri build    # produces installers
```

> Icons: `npx tauri icon path/to/logo.png` generates `src-tauri/icons/*` (referenced by `tauri.conf.json` bundle). Add the white-label logo there.

## Status / next

- [x] Shell wired to kernel (`calculate_bqs_row`) + persistence (`save_bqs_calculation`).
- [ ] Build locally once to validate the shell compiles with system deps.
- [ ] Wire the UI screens to `invoke(...)` (replace the demo data path).
- [ ] Add commands for comparison (NOAD/LOP) and section totals.
- [ ] SQLCipher (encryption at rest) before any distribution (`03-TRD §10`).
