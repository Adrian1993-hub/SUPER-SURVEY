# Seguridad y anti-ingeniería-inversa — SuperSurvey

> Revisión de la superficie de seguridad de la app de escritorio (Tauri v2 +
> kernel Rust + SQLite local) y de las medidas anti-copia. Offline-first: la app
> no requiere red y no emite telemetría.

## F2 — Superficie de seguridad

### CSP (Content-Security-Policy)
`tauri.conf.json` → `default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'`.
Sin orígenes remotos: fuentes auto-alojadas, sin CDN, sin `connect-src` externo.
`'unsafe-inline'` en estilos es necesario para los tokens de tema inyectados en
`:root`; no hay `script-src 'unsafe-inline'`.

### Capabilities de Tauri
`capabilities/default.json` = solo `core:default` sobre la ventana `main`. No se
habilita `fs`, `shell`, `http` ni `dialog` amplios. Cada capacidad nueva (p. ej.
`updater:default` cuando se integre el plugin) se añade explícitamente.

### Superficie IPC (comandos Tauri)
Todos los comandos toman DTOs tipados y validados por el kernel; ninguno acepta
una ruta de sistema de archivos arbitraria del frontend:
- Cálculo: `calculate_bqs_row`, `kernel_call` (fachada string-in/out; el enum de
  funciones es cerrado — una función desconocida es error, no ejecución).
- Persistencia: `save_measurement`, `list_jobs`, `load_job_detail`,
  `create_job`, `load_measurement_snapshots` — todas contra la BD SQLite gestionada.
- Lectura acotada: `read_brand_override` y `license_status` leen archivos con
  nombre FIJO (`brand.json`, `license.key`) SOLO del `app_config_dir` — no hay
  traversal ni parámetro de ruta.

### Datos en reposo
SQLite local sin cifrar (`supersurvey.db`), con `calculation_logs` **append-only**
(trazabilidad). Cifrado en reposo (SQLCipher) es una opción futura si un cliente
lo exige contractualmente; hoy la protección es el sistema de archivos del SO.

### Dependencias (auditoría 2026-07-04)
- **`npm audit --omit=dev`**: 1 alta — `xlsx` (SheetJS) sin fix en el registro
  npm. Uso: SOLO exportación local a .xlsx de datos que el propio usuario ve; no
  se parsea contenido remoto ni de terceros → superficie real mínima. Acción:
  vigilar; alternativa `exceljs` si el vector se vuelve relevante. Las vulns de
  `devDependencies` (build) no viajan en el producto.
- **`cargo audit`**: 1 warning — `RUSTSEC-2026-0190` (`anyhow::Error::downcast_mut`
  unsoundness), dependencia transitiva; el kernel no usa `downcast_mut`. Sin
  impacto; se actualizará con el próximo bump de dependencias.

## F3 — Anti-ingeniería-inversa (honesto: subir el coste, no imposibilitar)

### Qué protege el activo comercial (la matemática)
El bundle de **escritorio** ya **no incluye el `.wasm`** con el kernel: el build
`vite --mode desktop` sustituye el glue y el binario WASM por stubs, y TODOS los
cálculos van por IPC (`kernel_call`) al **binario nativo** Rust. Resultado: las
ecuaciones ASTM/API/COSTALD/Refutas viven únicamente dentro del ejecutable
compilado (difícil de descompilar), no en un artefacto `.wasm` extraíble y
reutilizable. (La demo **web** sí usa WASM — ahí el objetivo es demostrar, no
proteger.)

Verificación: `npm run build:desktop` → `dist/` sin `*.wasm` y sin símbolos
`wasm_bindgen`/`__wbindgen` (comprobado en el sandbox).

### Endurecimiento del binario
Perfil release de `ui/src-tauri` (`Cargo.toml`): `panic = "abort"`, `strip = true`,
`lto = true`, `codegen-units = 1`, `opt-level = "s"` → menos símbolos y menos
información de depuración en el ejecutable distribuido.

### Capas complementarias
- **Licencia firmada** (`docs/licencias.md`): Ed25519 impide fabricar licencias;
  gate suave hoy.
- **Sin secretos en el frontend** (no hay claves ni endpoints privados en el JS).
- **Contrato + soporte/updates solo a clientes licenciados** como disuasión real.

### Lo que NO se promete
Un binario local siempre puede desensamblarse o parchearse con suficiente
esfuerzo (quitar el chequeo de licencia, reimplementar la matemática observando
entradas/salidas del IPC). Ninguna técnica client-side lo evita al 100 %. La
estrategia es **elevar el coste** por encima del valor de copiar y respaldarla
legalmente, no vender una imposibilidad técnica.

## Política de repositorio
El historial git **no se reescribe** (destructivo). Para entregar el código a un
tercero se exporta un snapshot limpio sin `.git`. Los instaladores nunca incluyen
`docs/` ni las herramientas del dueño (`tools/supersurvey_keygen`, claves).
