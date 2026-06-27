# Empaquetado y distribución (Tauri v2)

SuperSurvey es **offline‑first de escritorio**. El cálculo corre en WASM; la app
empacada añade persistencia SQLite nativa. Esta guía cubre cómo construir los
instaladores, firmarlos y distribuirlos, y cómo cambiar la marca.

## 1. Build local

Requisitos por SO (una vez):
- **Rust** estable + target nativo; **Node 20**.
- **Linux:** `libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev librsvg2-dev libayatana-appindicator3-dev build-essential`.
- **Windows:** Visual Studio Build Tools (C++), WebView2 (preinstalado en Win10/11).
- **macOS:** Xcode Command Line Tools.

```bash
cd ui
npm ci
npx @tauri-apps/cli@2 build      # construye el frontend y empaca
```

Artefactos en `ui/src-tauri/target/release/bundle/`:
- Windows: `msi/*.msi`, `nsis/*-setup.exe`
- macOS: `dmg/*.dmg`, `macos/*.app`
- Linux: `appimage/*.AppImage`, `deb/*.deb`

`tauri.conf.json` ya define `targets: "all"`, identificador `com.supersurvey.app`,
iconos y metadatos del bundle (categoría, copyright, descripciones).

## 2. Release por CI (instaladores en 3 plataformas)

Workflow: `.github/workflows/supersurvey-release.yml` (matriz macOS/Linux/Windows
con `tauri-action`). Se dispara al **empujar un tag de versión**:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

Crea un **GitHub Release en borrador** con los bundles adjuntos. Sin secretos de
firma → bundles **sin firmar** (válidos, pero el SO mostrará advertencia).

> El otro workflow, `supersurvey-desktop.yml`, solo **valida** que el shell
> compila (clippy/fmt) en cada push; este de release **empaca**.

## 3. Firma de código (opcional, recomendado para distribución)

Se activa poniendo *secrets* en el repo (el workflow ya los referencia; si faltan,
se omite la firma):

- **Windows (Authenticode):** firma el `.msi`/`.exe` con tu certificado (EV o OV).
  Configúralo en `bundle.windows.certificateThumbprint` o vía herramienta externa.
- **macOS (Developer ID + notarización):** `APPLE_CERTIFICATE`,
  `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, y para notarizar
  `APPLE_ID` / `APPLE_PASSWORD` (app‑specific) / `APPLE_TEAM_ID`.
- **Updater de Tauri:** `TAURI_SIGNING_PRIVATE_KEY` (+ password). Genera el par con
  `npx @tauri-apps/cli signer generate`.

**Nunca** se commitean certificados ni claves — solo van como secrets de CI.

## 4. Cambiar la marca (white‑label)

Dos capas, complementarias:

**(a) Identidad de fábrica (build):** `branding/brand.toml` es la única fuente.
Para renombrar el producto (p. ej. a un licenciatario), edita `[product].name` /
`executable_name` ahí **y** `productName` / `identifier` en `tauri.conf.json`,
luego recompila.

**(b) Aspecto en runtime (sin recompilar):** ver §5.

## 5. Cambiar el aspecto visual SIN re‑empaquetar

- **Colores / logo / fuentes / nombre:** la app aplica un **override de branding en
  runtime** al arrancar (ver `ui/src/lib/brand.ts`). En escritorio lee un
  `brand.json` externo (carpeta de config del usuario); si existe, sobrescribe los
  tokens CSS (`--brand`, `--primary`, …) y el nombre del producto. Editas ese
  archivo → reinicias la app → nuevo look. **No requiere rebuild.**
- **Layout / componentes / estructura:** eso es código → requiere rebuild +
  re‑empaquetar, **pero** con el **auto‑updater de Tauri** la actualización se
  distribuye sola (el usuario no reinstala a mano).

Resumen: branding/tema en caliente **sí**; cambios estructurales necesitan rebuild
(indoloro vía updater).

## 6. Auto‑update (siguiente paso, opcional)

Añadir el plugin `tauri-plugin-updater`, publicar un `latest.json` firmado junto a
los bundles, y apuntar la app a su URL. La firma usa `TAURI_SIGNING_PRIVATE_KEY`
(§3). Con eso, los cambios de UI (incluidos los estructurales) llegan a los
usuarios sin reinstalar.
