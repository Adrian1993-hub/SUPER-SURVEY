import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as { version: string }

// base '/' (absoluta): Tauri v2 sirve frontendDist por su protocolo propio desde
// la raíz (la base relativa era una necesidad de Tauri v1/file://), y con './'
// los deep-links (/trabajo/1/…) del preview/hosting web rompen: ./assets se
// resuelve contra la ruta anidada → 404 y página en blanco.
//
// Modo 'desktop' (npm run build:desktop, usado por Tauri): el glue y el binario
// WASM se sustituyen por stubs — la matemática NO viaja en el bundle desktop
// (anti-RE, F3); allí el cálculo va por IPC al binario nativo (kernel_call).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      ...(mode === 'desktop'
        ? [
            {
              find: /^.*\/wasm\/supersurvey_wasm\.js$/,
              replacement: path.resolve(__dirname, 'src/wasm-stub/supersurvey_wasm.js'),
            },
            {
              find: /^.*\/wasm\/supersurvey_wasm_bg\.wasm/,
              replacement: path.resolve(__dirname, 'src/wasm-stub/empty.wasm'),
            },
          ]
        : []),
    ],
  },
  server: { port: 5173, strictPort: true },
}))
