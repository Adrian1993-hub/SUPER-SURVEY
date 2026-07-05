# Guía de usuario — SuperSurvey

> App **offline-first** para inspecciones de cantidad de carga y búnker (marino y
> petrolero). Mide → calcula con exactitud decimal → compara de forma defendible
> → produce un documento firmable. No necesita internet para operar.

## 1. Conceptos en 30 segundos

- **Trabajo (Job):** una operación (BQS, terminal, STS, draft…) con su buque,
  cliente, puerto y grados.
- **Kernel:** el motor de cálculo (Rust, decimal exacto). **Todas** las cifras
  oficiales salen de ahí y son trazables paso a paso (ASTM D1250 / API MPMS /
  COSTALD). La interfaz nunca “inventa” números.
- **Veredicto:** al comparar fuentes (buque/barcaza/BDN) contra las capas de
  tolerancia, el sistema recomienda **OK**, **NOAD** (nota de discrepancia
  aparente) o **LOP** (carta de protesta).
- **Offline-first:** todo se guarda localmente (SQLite); sin telemetría.

## 2. El flujo del trabajo (barra de pasos)

En cada pantalla de un trabajo verás arriba el **stepper** numerado; el paso
activo se resalta y los anteriores quedan en verde. Abajo, el botón
**«Continuar → …»** te lleva al siguiente paso sin volver al menú.

1. **Cover** — datos del trabajo: cliente, buque, puerto, operación, grados, partes.
2. **Perfiles** — perfil del buque, parámetros de cálculo (tabla ASTM, redondeos)
   y capas de tolerancia (ISO / contrato).
3. **Key Meeting** — acuerdos previos: grados confirmados, tanques nominados,
   secuencia.
4. **Medición** — la hoja de medición (antes/después). Escribes densidad,
   temperatura, TOV, agua libre…; las celdas **grises** las calcula el kernel en
   vivo (GOV, VCF, GSV, WCF, MT). El chip “Kernel …” confirma qué tablas se usan.
5. **Cálculo** — la cadena de cálculo explicada, número a número.
6. **Comparación** — buque vs barcaza vs BDN contra las tolerancias → veredicto y
   documentos (SOF/NOAD/LOP).
7. **Reporte** — el documento imprimible (PDF) + exportación XLSX/JSON, con
   bloques de firma.

### Operaciones específicas (menú lateral)

Multigrado (imperial), **Draft Survey**, **Buque ↔ Tierra** (terminal/pipeline),
**LPG** (gaseros: líquido + vapor), **Blend** (mezcla de fueloil), **Reporte ROB**
(inventario vs libro de máquinas) y **Plantillas** de reporte. Cada una calcula
todo con el mismo kernel.

## 3. Leer la hoja de medición

- **Celdas blancas** = tu entrada. **Celdas grises** = calculadas en vivo.
- En el cierre, las flechas ↑/↓ marcan cambios de volumen/temperatura vs. la
  apertura (solo referencia; no salen en el reporte).
- Un grado con densidad fuera de rango típico se resalta en ámbar (aviso, no
  bloqueo).

## 4. Utilidades

Conversores de densidad (API↔ρ15, ρ observada↔ρ15, mezcla por volumen), todos
con el kernel. Útiles fuera de un trabajo concreto.

## 5. Configuración (apariencia, actualizaciones, Acerca de)

Menú lateral → **Configuración**:

- **Apariencia:** elige **tema** (Océano / Control-room / Industrial), **modo**
  claro u oscuro, **fuente** (Geist o del sistema) y **densidad** de tablas
  (cómoda o compacta). Se aplica al instante y se recuerda en el equipo. (El
  cambio de tema también está en el conmutador de la barra superior.)
- **Actualizaciones:** botón **«Buscar actualizaciones»** (ver §6).
- **Acerca de:** versión de la app, versión del motor de cálculo, estado de
  licencia y estándares implementados.

## 6. Cómo actualizar

1. Configuración → **Buscar actualizaciones**.
2. Si hay una versión nueva, aparece **«Descargar e instalar»**; al terminar, la
   app se reinicia sola en la versión nueva.
3. Sin conexión no pasa nada: la app sigue funcionando; puedes actualizar cuando
   tengas red, o instalando manualmente el instalador más reciente.

> Las actualizaciones vienen **firmadas**: la app rechaza cualquier paquete que
> no esté firmado con la clave del fabricante. Detalle técnico y publicación de
> versiones: `docs/actualizaciones.md`.

## 7. Licencia

La app funciona en **modo evaluación** sin licencia (verás un aviso discreto en
la barra superior). Con una licencia válida (`license.key` provista por el
fabricante) el aviso desaparece. Instalación y renovación: `docs/licencias.md`.

## 8. Imprimir / exportar un reporte

En **Reporte** (o cualquier pantalla con botón PDF): **PDF / Imprimir** usa el
diálogo del sistema (el documento sale en papel blanco aunque uses un tema
oscuro). **XLSX** y **JSON técnico** exportan los mismos datos para archivo o
auditoría.

## 9. Privacidad y datos

Todo se guarda en una base **SQLite local** en tu equipo; los registros de
cálculo son **solo-anexar** (trazabilidad). No hay telemetría ni envío de datos.
Requisitos del equipo: `docs/requisitos-minimos.md`.

---

¿Dudas sobre un cálculo? Abre **Cálculo** en el trabajo: cada cifra oficial se
explica paso a paso con la tabla y la fórmula que la produjo.
