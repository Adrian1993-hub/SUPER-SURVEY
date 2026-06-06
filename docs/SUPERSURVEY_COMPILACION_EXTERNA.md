# SuperSurvey - Compilacion externa sin permisos de administrador

Esta carpeta ya quedo preparada para compilar el kernel Rust fuera de tu laptop usando GitHub Actions.

## Que se preparo

- `.github/workflows/supersurvey-rust-kernel.yml`
  - Compila y prueba el kernel Rust en Ubuntu.
  - Revisa formato con `cargo fmt`.
  - Ejecuta pruebas con `cargo test --locked`.
  - Ejecuta revision tecnica con `cargo clippy`.
  - Valida el schema SQLite hardened v0.1.3.1.

- `rust-kernel/supersurvey_calc/`
  - Copia limpia del kernel Sprint 1C.
  - Incluye el parche 1C.1 de politica de agregacion.

- `rust-kernel/schema/`
  - Incluye `supersurvey_sqlite_schema_v0_1_3_1_hardened.sql`.

## Opcion recomendada: GitHub desde el navegador

1. Entra a GitHub y crea un repositorio nuevo.
2. Sube solo estos elementos al repositorio:
   - `.github/`
   - `rust-kernel/`
   - `.gitignore`
   - `SUPERSURVEY_COMPILACION_EXTERNA.md`
3. Abre la pestana `Actions`.
4. Abre el workflow `SuperSurvey Rust Kernel`.
5. Presiona `Run workflow`.
6. Si queda en verde, la compilacion externa paso.

No necesitas tener Rust, Git ni Visual Studio instalados en esta computadora.

## Como leer el resultado

- Verde: el kernel compila y las pruebas pasan.
- Rojo: GitHub mostrara el error exacto. Ese error se puede copiar aqui para corregirlo.

## Nota sobre esta laptop

La validacion local de formato Rust y del schema SQLite paso, pero la compilacion local completa queda bloqueada porque Windows no encuentra `link.exe`. Ese componente viene con Visual Studio Build Tools y normalmente requiere permisos de administrador. Por eso la ruta recomendada es GitHub Actions.

## Documentos base usados

- Schema final recomendado: `SuperSurvey_SQLite_Schema_v0_1_3_1_HARDENED_Package.zip`
- Kernel base recomendado: `SuperSurvey_Rust_Calculation_Kernel_v0_1_Sprint_1C_Movement_Aggregation_Package.zip`
- Parche aplicado: `PATCH_1C_1_aggregation_policy.md`

Los paquetes 1A y 1B no estaban mal; simplemente son etapas anteriores. Para compilar ahora, la base correcta es Sprint 1C con el parche 1C.1 y el schema v0.1.3.1 hardened.
