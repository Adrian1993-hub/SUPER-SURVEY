# Actualizaciones de SuperSurvey — diseño y operación

> **Decisión**: `tauri-plugin-updater` (Tauri v2) con **GitHub Releases** como
> endpoint y artefactos firmados (minisign). Offline-first: el chequeo NUNCA
> bloquea — sin red la app funciona exactamente igual; la actualización manual
> (bajar el instalador) siempre queda como alternativa.

## Estado actual (qué quedó cableado)

| Pieza | Estado |
|---|---|
| Par de firma del updater (minisign) | ✅ generado; **privada entregada al dueño** (no está en el repo) |
| `tauri.conf.json → plugins.updater` | ✅ pubkey + endpoint (`releases/latest/download/latest.json`). Config pasiva: sin el plugin Rust instalado, Tauri la ignora. |
| CI (`supersurvey-release.yml`) | ✅ si el secret `TAURI_SIGNING_PRIVATE_KEY` existe, inyecta `createUpdaterArtifacts` por `--config`, firma los bundles y publica `latest.json` + `.sig` en el release. Sin secret: build normal sin updater (no rompe). |
| Plugin runtime en la app | ⏳ 4 pasos abajo — requiere entorno con GTK/desktop para compilar y PROBAR (el sandbox de desarrollo no compila Tauri). |

## Activar la firma en CI (una vez)

1. GitHub → Settings → Secrets → Actions:
   - `TAURI_SIGNING_PRIVATE_KEY` = contenido de `updater.key` (entregado aparte)
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = vacío (el par se generó sin password)
2. Lanzar el workflow de release. El draft incluirá `latest.json` y `*.sig`.

## Pasos restantes del plugin runtime (hacer con entorno desktop, ~30 min)

```bash
# 1) Rust (ui/src-tauri)
cargo add tauri-plugin-updater
#    lib.rs:  .plugin(tauri_plugin_updater::Builder::new().build())
# 2) Permiso (ui/src-tauri/capabilities/default.json): añadir "updater:default"
# 3) JS:  npm i @tauri-apps/plugin-updater
# 4) UI (Utilidades): botón «Buscar actualizaciones» —
#    const up = await check(); if (up) { await up.downloadAndInstall(); relaunch() }
#    Guardado tras isDesktop(); en la demo web no se muestra.
```

Probar en una máquina real: instalar la versión N, publicar N+1, pulsar el botón
y verificar descarga+firma+reinicio. **No integrar a ciegas**: este es el único
tramo que no se pudo compilar/probar en el sandbox.

## Flujo de release (operación normal)

1. Subir versiones (`ui/src-tauri/tauri.conf.json`, Cargo.toml, package.json).
2. Disparar el workflow (workflow_dispatch con `version: vX.Y.Z`, o push del tag).
3. Revisar el DRAFT (instaladores + latest.json) y **Publish**.
4. Las apps instaladas detectan `latest.json`, verifican la firma con la pubkey
   embebida e instalan.

## Rollback

GitHub Releases conserva todas las versiones: des-publicar (o borrar) el release
malo hace que `releases/latest` apunte al anterior; los clientes afectados
reinstalan el instalador previo (los datos viven en SQLite del usuario, no se
tocan; además la app respalda la BD automáticamente en `backups/` al detectar
cambio de versión — retención 3). El updater no tiene downgrade automático — el rollback es re-publicar.

## Seguridad

- La pubkey del updater está embebida; `latest.json` sin firma válida se rechaza.
- **Perder la privada = no poder publicar más updates firmadas** (habría que
  rotar pubkey con un release manual). Guardarla como el keygen de licencias.
- La firma del updater NO sustituye el code-signing de Windows/macOS
  (SmartScreen/Gatekeeper) — eso sigue pendiente con certificados propios
  (docs/packaging.md §3).
