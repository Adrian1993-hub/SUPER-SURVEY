// Runtime branding override — applies theme color tokens + product name from an
// external brand.json WITHOUT a rebuild (see docs/packaging.md §5).
//
// - Desktop: reads brand.json from the app config dir via a Tauri command, so an
//   operator can restyle a packaged install by editing one file (no rebuild).
// - Browser demo: optional /brand.json (none shipped by default → keeps the
//   built-in theme).
//
// This is the FACTORY default's runtime sibling: brand.toml bakes identity into a
// build; brand.json overrides colors/name at startup.

import { isDesktop } from './ipc'

export interface BrandOverride {
  productName?: string
  colors?: {
    brand?: string
    brand2?: string
    primary?: string
    accent?: string
  }
}

function applyBrand(b: BrandOverride): void {
  const root = document.documentElement
  const set = (token: string, value?: string) => {
    if (value) root.style.setProperty(token, value)
  }
  set('--brand', b.colors?.brand)
  set('--brand-2', b.colors?.brand2)
  set('--primary', b.colors?.primary)
  set('--accent', b.colors?.accent)
  if (b.productName) document.title = b.productName
}

/** Apply a runtime branding override if one exists. Safe no-op otherwise. */
export async function loadBrandOverride(): Promise<void> {
  try {
    let json: string | null = null
    if (isDesktop()) {
      const { invoke } = await import('@tauri-apps/api/core')
      json = await invoke<string | null>('read_brand_override')
    } else {
      const res = await fetch('/brand.json').catch(() => null)
      if (res && res.ok) json = await res.text()
    }
    if (json) applyBrand(JSON.parse(json) as BrandOverride)
  } catch {
    /* sin override válido → se conserva el tema por defecto */
  }
}
