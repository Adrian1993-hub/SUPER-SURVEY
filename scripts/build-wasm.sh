#!/usr/bin/env bash
#
# Rebuild the WASM calc kernel + its JS bindings, which the browser UI imports.
#
# Why committed output: the generated files land in ui/src/wasm/ and are committed
# so the normal frontend build (npm run build / vite) needs NO Rust or wasm
# toolchain. Run this only when the calc kernel changes, then commit the result.
#
# Requirements (install once):
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-bindgen-cli --version <matching wasm-bindgen crate version>
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRATE="$ROOT/rust-kernel/supersurvey_wasm"
OUT="$ROOT/ui/src/wasm"

# uuid's v4 (used for kernel trace ids) needs a wasm RNG backend; select web-crypto.
export RUSTFLAGS="${RUSTFLAGS:-} --cfg getrandom_backend=\"wasm_js\""

rustup target add wasm32-unknown-unknown >/dev/null 2>&1 || true

echo "==> building $CRATE for wasm32-unknown-unknown (release)"
( cd "$CRATE" && cargo build --release --target wasm32-unknown-unknown )

WASM="$CRATE/target/wasm32-unknown-unknown/release/supersurvey_wasm.wasm"

# Keep the CLI and crate versions in lockstep, or wasm-bindgen refuses to run.
if command -v wasm-bindgen >/dev/null 2>&1; then
  echo "==> wasm-bindgen $(wasm-bindgen --version)"
else
  echo "!! wasm-bindgen CLI not found. Install with:" >&2
  echo "   cargo install wasm-bindgen-cli --version 0.2.123" >&2
  exit 1
fi

echo "==> generating JS bindings -> $OUT"
wasm-bindgen --target web --out-dir "$OUT" "$WASM"

echo "==> done:"
ls -la "$OUT"
