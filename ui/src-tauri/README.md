# /ui/src-tauri — Desktop shell (Tauri v2)

Thin desktop wrapper that connects the **TypeScript UI** to the **Rust calc kernel**
and **SQLite persistence**. It holds **no calculation logic** — every official number
comes from `supersurvey_calc`; storage from `supersurvey_persistence`.

## CI

Building Tauri needs system libraries the kernel CI image doesn't install
(`webkit2gtk`, `libsoup`, `gtk`). So instead of the `rust-kernel` workflow, this
crate has its **own** workflow — [`supersurvey-desktop.yml`](../../.github/workflows/supersurvey-desktop.yml) —
that apt-installs those deps, builds the frontend (`ui/dist`, which
`generate_context!` embeds), and runs `cargo fmt --check` + `cargo clippy -D warnings --locked`.
It triggers on `ui/**` and `rust-kernel/**` (the shell depends on both). The math
and storage it wraps are also fully tested in their own crates.

> Verified to compile against `tauri 2.11`, `webkit2gtk-4.1 2.52` (placeholder
> icons in `icons/`). The `.icns` for macOS bundling is still TODO — see below.

## IPC commands (Rust → TS)

| Command | Does |
|---|---|
| `calculate_bqs_row(request)` | Pure calc (no DB). Returns the full row + trace. |
| `save_bqs_calculation(job_id, …, request)` | Calc + persist as an append-only `calculation_log`. Returns the log id. |
| `save_measurement(args)` | Create job + measurement set, then append one immutable `calculation_log` per tank row (each recomputed with the kernel). Returns `{ job_id, measurement_set_id, saved, skipped }`. Used by the UI's **Guardar medición**. |

> The UI does live calc via WASM (`src/lib/kernel.ts`); only **persistence** crosses
> this IPC boundary (`src/lib/ipc.ts`), gated on the Tauri runtime.

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
- [x] Compiles with system deps — validated locally **and** in CI (`supersurvey-desktop.yml`).
- [x] Placeholder icons committed (`icons/`); regenerate branded ones with `npx tauri icon`.
- [x] `save_measurement` command + UI **Guardar medición** button (desktop-gated via `src/lib/ipc.ts`).
- [ ] Verify the save end-to-end in a packaged build (DB logic is unit-tested; GUI run pending).
- [ ] Real macOS `icon.icns` (only PNG + `.ico` shipped so far).
- [ ] SQLCipher (encryption at rest) before any distribution (`03-TRD §10`).
