# /branding — White-label (el "camino oculto")

Aquí vive **toda** la identidad pública del producto. Para cambiar la marca
(nombre, logo, colores, encabezados de reporte) **solo se edita `brand.toml`** y
se recompila. No hay que tocar código, UI ni plantillas de reporte.

## Renombrar el producto (ej. a "YOLO.EXE")

En `brand.toml`:

```toml
[product]
name            = "YOLO.EXE"      # antes: "SuperSurvey"
executable_name = "yolo"

[reports]
header_title = "YOLO.EXE"
pdf_author   = "YOLO.EXE"
pdf_creator  = "YOLO.EXE"
```

Eso es todo. "SuperSurvey" es solo el **nombre clave interno** (repo/crate); el
nombre que ven el usuario y los reportes sale de aquí.

## Dos capas (no se contradicen)

| Capa | Dónde | Cuándo | Para qué |
|---|---|---|---|
| **Build-time** | `branding/brand.toml` | al compilar un build | identidad por defecto de ese build (white-label para un licenciatario) |
| **Runtime** | tabla SQLite `app_settings` + `inspectors.signature_image_path` | dentro de la app | overrides por instalación/usuario (empresa, logo, firmas) |

## Consumidores (cuando se construyan)

- **UI (TypeScript):** lee `brand.toml` para título, logo y tema.
- **Report engine (Rust):** lee `brand.toml` para header/footer/metadatos del PDF.
- **Instalador:** usa `executable_name`.

**Regla:** ningún otro archivo hardcodea nombre/logo/colores. Todo sale de aquí.

> Estado: semilla del white-label (Fase 4 del Ultraplan). Los consumidores se
> conectan cuando existan UI y report engine. La matemática (kernel Rust) es
> independiente del nombre, así que **renombrar nunca toca el motor**.
