import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { ThemeProvider } from './theme/ThemeProvider'
import { loadBrandOverride } from './lib/brand'

// Apply a runtime branding override (brand.json) if present — restyle without a
// rebuild. Fire-and-forget so it never blocks first paint.
void loadBrandOverride()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
