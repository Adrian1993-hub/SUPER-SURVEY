#!/usr/bin/env node
// QA visual de la matriz de temas: captura las 6 combinaciones (3 estéticas ×
// claro/oscuro) sobre las rutas clave de la demo web, más un PDF del Reporte
// (verificación de impresión). Salida: ui/screenshots/ (gitignored).
//
// Requisitos: `npm run build` previo en ui/ (usa `vite preview`, no dev);
// Chromium de Playwright preinstalado (PLAYWRIGHT_BROWSERS_PATH).
//
// Uso:  node scripts/screenshot-themes.mjs

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const UI = resolve(ROOT, 'ui')
// playwright vive en ui/node_modules — resolver desde ahí, no desde scripts/.
const require = createRequire(resolve(UI, 'package.json'))
const { chromium } = require('playwright')
const OUT = resolve(UI, 'screenshots')
const PORT = 4187
const BASE = `http://127.0.0.1:${PORT}`

const THEMES = ['ocean', 'control-room', 'industrial']
const MODES = ['light', 'dark']
const ROUTES = [
  ['/', 'dashboard'],
  ['/trabajos', 'trabajos'],
  ['/trabajo/1/medicion', 'medicion'],
  ['/trabajo/1/comparacion', 'comparacion'],
  ['/trabajo/1/reporte', 'reporte'],
  ['/design', 'design'],
]

function startPreview() {
  // Binario de vite directo (sin wrapper npx): el kill alcanza al proceso real.
  // Ruta de filesystem (require.resolve lo bloquea el campo "exports" de vite).
  const viteBin = resolve(UI, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(
    process.execPath,
    [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { cwd: UI, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  return new Promise((resolveReady, reject) => {
    const onData = (d) => {
      if (String(d).includes(String(PORT))) resolveReady(child)
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', (d) => process.stderr.write(d))
    child.on('exit', (code) => reject(new Error(`vite preview exited early (${code})`)))
    setTimeout(() => resolveReady(child), 6000) // red de seguridad
  })
}

const server = await startPreview()
// El preview muere con este proceso pase lo que pase (sin huérfanos de puerto).
process.on('exit', () => { try { server.kill('SIGKILL') } catch { /* ya muerto */ } })
mkdirSync(OUT, { recursive: true })
// Chromium preinstalado del entorno (la revisión que espera la lib puede no
// coincidir): usar el ejecutable real si existe.
const PREINSTALLED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch(
  existsSync(PREINSTALLED) ? { executablePath: PREINSTALLED } : {},
)

let shots = 0
for (const theme of THEMES) {
  for (const mode of MODES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await ctx.addInitScript(
      ([t, m]) => {
        localStorage.setItem('ss-theme', t)
        localStorage.setItem('ss-mode', m)
      },
      [theme, mode],
    )
    const page = await ctx.newPage()
    for (const [route, name] of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'networkidle' })
      await page.waitForTimeout(450) // animaciones de entrada + kernel WASM live
      await page.screenshot({ path: `${OUT}/${theme}-${mode}-${name}.png`, fullPage: false })
      shots++
    }
    // PDF de impresión del Reporte (una vez por combinación: papel blanco siempre)
    await page.goto(`${BASE}/trabajo/1/reporte`, { waitUntil: 'networkidle' })
    await page.emulateMedia({ media: 'print' })
    await page.pdf({ path: `${OUT}/${theme}-${mode}-reporte-print.pdf`, format: 'A4' })
    await ctx.close()
  }
}

await browser.close()
server.kill()
console.log(`OK: ${shots} capturas + 6 PDFs en ${OUT}`)
