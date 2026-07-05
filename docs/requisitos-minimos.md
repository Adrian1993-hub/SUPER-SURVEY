# Requisitos mínimos y uso de recursos — SuperSurvey

> Cifras **medidas** en este repositorio (con el método al lado) más rangos
> **claramente marcados como estimados** donde no se pudo medir en el entorno de
> desarrollo. La app es Tauri v2 (WebView del SO + binario nativo Rust +
> SQLite), no Electron: su huella es sensiblemente menor.

## 1. Disco

| Componente | Tamaño | Método |
|---|---|---|
| Frontend empaquetado (web/demo, con WASM) | **1.6 MB** | `du -sh ui/dist` |
| Frontend empaquetado (escritorio, SIN WASM) | **≈1.1 MB** | `du -sh ui/dist` tras `npm run build:desktop` |
| — de eso, JS de app | 448 KB | `du ui/dist/assets/index-*.js` |
| — de eso, exportador XLSX | 420 KB | `du ui/dist/assets/xlsx-*.js` |
| Fuentes (Geist + Geist Mono, woff2) | 144 KB | `du -ch ui/public/fonts/*.woff2` |
| Esquema SQLite (37 tablas) | 33 KB de SQL | `ls -la rust-kernel/schema/*hardened.sql` |
| **Instalador (.msi/.dmg/.AppImage/.deb)** | **≈3–12 MB** *(estimado)* | típico de Tauri; **confirmar** con el release publicado (el draft v0.1.0 está sin publicar, sus assets no son consultables aún) |
| **App instalada en disco** | **≈15–40 MB** *(estimado)* | binario nativo + frontend + iconos; el WebView es del SO |

**Base de datos (crecimiento por trabajo).** SQLite arranca prácticamente vacía.
Cada trabajo añade: 1 fila de job + 1 measurement_set + *N* filas de tanque (con
snapshot VmrTank ~0.3–0.5 KB c/u) + *N* `calculation_logs` **solo-anexar**
(snapshot de entrada+salida ~1–3 KB c/u). Para un BQS típico de 8 tanques con
antes+después (~16 filas + ~16 logs): **≈50–150 KB por trabajo** (método: tamaño
de los JSON de snapshot × filas + sobrecarga de página/índices de SQLite). Miles
de trabajos siguen siendo decenas de MB.

## 2. Memoria (RAM)

**Medido** (heap JS de la propia app, `performance.memory` vía Chromium, ruta más
pesada):

| Pantalla | Heap usado | Heap reservado |
|---|---|---|
| Dashboard | 4.1 MB | 6.9 MB |
| Medición (grid + kernel en vivo) | 7.8 MB | 11.5 MB |
| Reporte (documento completo) | 11.7 MB | 15.9 MB |

A eso se suma el **baseline del WebView** del SO (WebView2 en Windows, WebKitGTK
en Linux, WKWebView en macOS) más el proceso Rust. Rango **publicado** para apps
Tauri mínimas: ~40–90 MB en reposo (frente a ~120–250 MB de Electron). **Estimación
del working set total** de SuperSurvey en uso: **≈120–220 MB**.

> Nota honesta: la medición es del heap JS (nuestra parte); el consumo total lo
> domina el WebView, que se midió con Chromium como aproximación, no con el
> WebView nativo de cada SO. Trátese como orden de magnitud, no cifra exacta.

## 3. Estándares mínimos por sistema operativo

| SO | Mínimo | Notas |
|---|---|---|
| **Windows** | 10 v1803 x64 | Requiere **WebView2 Runtime** (Evergreen; preinstalado en Win11 y en Win10 reciente, o lo instala el bootstrapper). |
| **macOS** | 10.15 Catalina+ | WKWebView del sistema; x64 y Apple Silicon (arm64). |
| **Linux** | glibc reciente + `webkit2gtk-4.1` | p. ej. Ubuntu 22.04+ / Debian 12+; el .deb declara sus dependencias. |

**Hardware (todas las plataformas):**

| | Mínimo | Recomendado |
|---|---|---|
| CPU | x64 o arm64 de 2 núcleos | 4 núcleos |
| RAM | **4 GB** | **8 GB** |
| Disco | 200 MB libres | 1 GB (histórico de trabajos) |
| Red | **ninguna** (offline-first) | opcional (buscar actualizaciones) |
| Pantalla | 1024×768 | 1440×900+ |

## 4. Con asistente IA local (tier opcional, futuro)

Si se integra el LLM offline (ver `docs/research/llm-offline.md`), el modelo es lo
que domina los requisitos:

| | Con IA (modelo 3–4B Q4) | Con IA (modelo 7–8B Q4) |
|---|---|---|
| RAM adicional | +3–4 GB → **8 GB mín / 16 GB rec** | +5–6 GB → **16 GB rec** |
| Disco adicional | +2–3 GB (modelo) | +4–5 GB (modelo) |
| Distribución | modelo **descargable post-instalación**, nunca dentro del instalador base |

## 5. Uso seguro

- **Offline-first:** no requiere internet para operar; sin telemetría.
- **Datos locales:** SQLite en el equipo; `calculation_logs` solo-anexar
  (trazabilidad). Respaldar = copiar el archivo `.db` (ver directorio de datos
  por SO en `docs/licencias.md`).
- **Superficie de red mínima:** solo el chequeo opcional de actualizaciones
  (GitHub Releases, firmado). Ver `docs/seguridad.md`.

---
*Metodología:* las cifras “medidas” provienen de `du`/`ls` sobre el build y de
`performance.memory` bajo Chromium (`scripts/screenshot-themes.mjs` monta la misma
infraestructura de preview). Las marcadas *(estimado)* deben confirmarse contra el
primer release publicado y contra una instalación real en cada SO.
