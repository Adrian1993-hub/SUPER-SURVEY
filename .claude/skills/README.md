# .claude/skills — Skills de desarrollo (no son parte del producto)

Estos skills ayudan **durante el desarrollo** con Claude Code. **No se compilan ni se
distribuyen** con el producto final (viven en la config de Claude Code, no en el binario).

| Skill | Para qué sirve | Invocar |
|---|---|---|
| `grill-me` | Entrevista adversarial: interroga un plan/diseño rama por rama antes de implementar | `/grill-me` |
| `diagnose` | Flujo estructurado de depuración de bugs difíciles (reproducir → minimizar → hipótesis → fix) | `/diagnose` |

**Origen / atribución:** copiados de [`mattpocock/skills`](https://github.com/mattpocock/skills)
(ver `LICENSE`). 

**Nota:** el comando `/plugin` de Claude Code **no funciona en la web/remoto**; por eso estos
skills se instalan como *skills de proyecto* (carpeta `.claude/skills/`), que sí persisten en
el repositorio y quedan disponibles en cada sesión.

Pendiente de confirmar con el usuario: `agency` (hay 2 candidatos) y `gstack` (probable
intención de "gistack"). Ver el resumen en la conversación.
