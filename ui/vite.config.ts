import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// base '/' (absoluta): Tauri v2 sirve frontendDist por su protocolo propio desde
// la raíz (la base relativa era una necesidad de Tauri v1/file://), y con './'
// los deep-links (/trabajo/1/…) del preview/hosting web rompen: ./assets se
// resuelve contra la ruta anidada → 404 y página en blanco.
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173, strictPort: true },
})
