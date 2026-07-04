# Licencias SuperSurvey — emisión y validación

> Sistema de licencias **offline** (sin servidor): un archivo `license.key` con un
> payload JSON firmado **Ed25519**. La app embebe SOLO la clave pública y valida al
> arrancar; las licencias las emite el **keygen del dueño** (herramienta aparte,
> nunca distribuida con la app).

## Piezas

| Pieza | Dónde | Contiene |
|---|---|---|
| `tools/supersurvey_license` | repo (lib) | payload, firma/verificación; la emisión va tras la feature `issuer` |
| `tools/supersurvey_keygen` | repo (bin del dueño) | CLI: `generate-keypair` / `issue` / `verify` |
| Clave **privada** | SOLO en poder del dueño (fuera del repo; `tools/.gitignore` bloquea `keys/`) | emite licencias |
| Clave **pública** | embebida en `ui/src-tauri/src/license.rs` (`LICENSE_PUBLIC_KEY`) | verifica |
| `license.key` | directorio de configuración de la app del cliente (junto a `brand.json`) | payload + firma |

Directorio de configuración por SO (Tauri `app_config_dir`, identifier `com.supersurvey.app`):
- **Windows:** `%APPDATA%\com.supersurvey.app\`
- **macOS:** `~/Library/Application Support/com.supersurvey.app/`
- **Linux:** `~/.config/com.supersurvey.app/`

## Flujo del dueño

```bash
cd tools/supersurvey_keygen && cargo build --release
KG=target/release/supersurvey_keygen

# 1) Una sola vez: generar el par (¡guardar private.key fuera del repo!)
$KG generate-keypair --out-dir keys/
#    → imprime la constante LICENSE_PUBLIC_KEY para pegar en license.rs si se rota.

# 2) Por cliente: emitir
$KG issue --key keys/private.key --client "Naviera X S.A." \
    --expires 2027-12-31 --features bqs,lpg --out license-navieraX.key

# 3) Verificar cualquier licencia
$KG verify --pub keys/public.key license-navieraX.key
```

Entrega al cliente: renombrar a `license.key` y copiarla al directorio de
configuración (arriba). Sin licencia la app **funciona igual** pero muestra el
chip «Modo evaluación» (gate suave — endurecerlo a bloqueo es una decisión
comercial posterior; el punto de corte está centralizado en `license_status`).

## Renovación / rotación

- **Renovar cliente:** emitir una licencia nueva con `--expires` posterior y
  reemplazar el archivo. No hay estado en la app.
- **Rotar el par** (privada comprometida): `generate-keypair` a un dir nuevo,
  pegar la nueva constante en `license.rs`, recompilar y re-emitir TODAS las
  licencias vigentes. Las viejas pasan a `INVALID_SIGNATURE`.

## Estados que reporta la app (`license_status`)

`VALID` · `EXPIRED` · `INVALID_SIGNATURE` · `MALFORMED` · `MISSING` (y
`DEMO_WEB` en el navegador). La UI solo muestra chip cuando NO es `VALID`.

## Honestidad técnica (leer antes de prometer nada)

- La firma Ed25519 hace **imposible fabricar** una licencia válida sin la clave
  privada (y manipular el payload la invalida — cubierto por tests).
- **Ningún** esquema client-side impide que alguien con el binario lo parchee
  para saltarse el chequeo. La defensa real es por capas: coste de ingeniería
  inversa (ver `docs/seguridad.md`, F3), licencia + contrato, y soporte/updates
  solo para clientes licenciados.
- Los tests viven en `tools/supersurvey_license` (`cargo test --features issuer`):
  emitir→válida, expirada, payload manipulado, clave equivocada, firma corrupta.
