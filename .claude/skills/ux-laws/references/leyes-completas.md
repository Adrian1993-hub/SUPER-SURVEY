# Las 30 Leyes de UX — referencia completa

Cada ley incluye: definición, mecanismo cognitivo, ejemplo digital, anti-patrón, cuándo NO aplica.

Fuente conceptual: Jon Yablonski, lawsofux.com (CC BY-NC-ND 4.0). Formulación y ejemplos aquí son originales.

---

## GESTALT (agrupación visual)

### 1. Law of Common Region
**Definición:** los elementos que comparten un área delimitada (borde, color de fondo, contenedor) se perciben como grupo.

**Mecanismo:** el sistema visual usa límites como pistas de organización antes que la lógica.

**Ejemplo digital:** cards de producto en un e-commerce, secciones de un dashboard con background diferente.

**Anti-patrón:** poner elementos relacionados sin un contenedor visual → el usuario no los asocia.

**En tus proyectos:** en RadFlow, agrupar los hallazgos por sistema anatómico dentro de un card con borde suave = usuario percibe la agrupación sin leer los headers.

---

### 2. Law of Proximity
**Definición:** los objetos cercanos entre sí tienden a percibirse como un grupo.

**Mecanismo:** distancia física = distancia conceptual, según el cerebro.

**Ejemplo digital:** labels pegados al input correspondiente, no equidistantes de dos inputs.

**Anti-patrón:** espaciado uniforme entre todo → nada se agrupa, todo se ve plano.

**Regla práctica:** el espacio *entre* grupos debe ser al menos el doble del espacio *dentro* de un grupo.

---

### 3. Law of Prägnanz (Ley de la Simplicidad)
**Definición:** el ojo prefiere la interpretación más simple posible de una forma ambigua.

**Mecanismo:** el cerebro minimiza esfuerzo cognitivo. Ve círculos, no óvalos deformados.

**Ejemplo digital:** logos icónicos (Apple, Nike), iconos con forma geométrica clara.

**Anti-patrón:** iconos con demasiado detalle → el cerebro tiene que trabajar para "leer" la forma.

---

### 4. Law of Similarity
**Definición:** elementos que se parecen visualmente se perciben como relacionados o del mismo tipo.

**Mecanismo:** el patrón visual = categoría mental.

**Ejemplo digital:** todos los botones primarios en el mismo color y forma → el usuario aprende una vez, aplica siempre.

**Anti-patrón:** botón "Cancelar" y botón "Guardar" con estilos aleatoriamente diferentes en cada pantalla.

**Aplicado a SuperSurvey:** todos los campos de cálculo de cargo (TOV, GOV, GSV) deben verse iguales entre sí y diferentes de los campos de metadatos.

---

### 5. Law of Uniform Connectedness
**Definición:** elementos visualmente conectados (por línea, contenedor o color) se perciben como más relacionados que elementos separados.

**Mecanismo:** la conexión visual es la agrupación más fuerte de todas las gestalt (más fuerte que proximidad o similitud).

**Ejemplo digital:** tabs con línea que las une al contenido, diagramas de flujo con flechas.

**Anti-patrón:** tabs que se ven flotantes sin conexión al contenido debajo.

---

## CARGA COGNITIVA Y MEMORIA

### 6. Cognitive Load
**Definición:** los recursos mentales necesarios para entender e interactuar con una interfaz.

**Tres tipos:**
- **Intrínseca:** dificultad inherente de la tarea (no la podés eliminar).
- **Extraña:** carga añadida por mal diseño (ELIMINABLE — este es tu enemigo).
- **Pertinente:** carga necesaria para aprender (BUENA en apps que requieren aprendizaje).

**Corrección estándar:** eliminar todo lo que no ayude a la tarea principal. Menos pestañas, menos jerarquía innecesaria, menos decoración.

**En tus proyectos:** el "cockpit" de SAA-C03 tiene carga intrínseca alta (contenido difícil) → cero tolerancia a carga extraña (UI limpia, un solo foco por vista).

---

### 7. Miller's Law
**Definición:** la persona promedio solo puede mantener 7±2 items en su memoria de trabajo.

**Mito común:** "solo mostrá 7 items" — NO. Miller hablaba de memoria de trabajo, no de percepción visual.

**Aplicación correcta:** cuando pidas al usuario que **recuerde** algo (código, ítems para reproducir), mantenerlo bajo 7. Si solo va a mirar/reconocer, no aplica el límite.

**Ejemplo digital:** código OTP de 6 dígitos (7-1), no de 12.

**Anti-patrón:** pedir al usuario que memorice una lista de 15 códigos de commodity para elegir después.

---

### 8. Chunking
**Definición:** dividir información en grupos con significado facilita procesarla y recordarla.

**Ejemplo clásico:** teléfono `+507 6123-4567` (3 chunks) es más fácil que `50761234567` (11 dígitos).

**Ejemplo digital:** wizards divididos en secciones con nombre; formularios largos partidos por tema.

**En SuperSurvey:** la ficha de operación petrolera → chunks por etapa (vessel data → cargo data → measurements → calculations → sign-off).

---

### 9. Working Memory
**Definición:** sistema cognitivo que temporalmente sostiene y manipula información necesaria para tareas complejas.

**Diferencia con Miller's Law:** Miller mide *capacidad*, Working Memory es *el sistema completo* (incluye duración: ~15–30 segundos si no repetís).

**Consecuencia de diseño:** si el usuario tiene que ir a otra pantalla a buscar info y volver, esa info ya se le olvidó. Solución: mostrarla en contexto o traerla al lado.

---

### 10. Serial Position Effect
**Definición:** las personas recuerdan mejor el primer y el último ítem de una serie.

**Componentes:**
- **Primacy effect:** el primero se recuerda porque se procesó con atención plena.
- **Recency effect:** el último se recuerda porque sigue en memoria de trabajo.
- **Los del medio:** se pierden.

**Aplicación:** poner la acción más importante al inicio o al final del menú/lista, no en el medio.

**Ejemplo:** navegación con "Home" primero y "Contacto/CTA" último. Nunca escondás el CTA en la posición 3 de 5.

---

## TOMA DE DECISIONES

### 11. Hick's Law
**Definición:** el tiempo para tomar una decisión aumenta logarítmicamente con el número y complejidad de opciones.

**Fórmula:** T = b · log₂(n+1) — donde n = número de opciones.

**Aplicación:**
- Reducir opciones (menos ítems de menú)
- Agrupar opciones (categorías)
- Ocultar opciones avanzadas por defecto (progressive disclosure)
- Sugerir un default recomendado

**Ejemplo:** Netflix con 10.000 películas → algoritmo de recomendación reduce a "top 10 para vos".

**En SuperSurvey:** en lugar de un dropdown con 50 commodities, primero preguntar la categoría (petroleum / LPG / chemical) → luego mostrar solo las de esa categoría.

---

### 12. Choice Overload
**Definición:** cuando hay demasiadas opciones, la gente se paraliza y no elige nada (o elige mal y se arrepiente).

**Diferencia con Hick's Law:** Hick es sobre *tiempo*, Choice Overload es sobre *abandono y arrepentimiento*.

**Estudio clásico:** Iyengar & Lepper — góndola con 24 mermeladas atrajo más gente que la de 6, pero vendió 10× menos.

**Solución:** menos opciones, defaults inteligentes, filtros progresivos.

---

### 13. Cognitive Bias
**Definición:** error sistemático de pensamiento que influencia percepción y decisiones.

**Sesgos comunes en UX:**
- **Anchoring:** el primer número/precio que ve marca la referencia.
- **Loss aversion:** dolor de perder > placer de ganar (2:1). Usar "no te pierdas..." pega más que "obtené...".
- **Framing:** "95% de éxito" vibra distinto que "5% de fallo".
- **Confirmation bias:** el usuario ignora info que contradice lo que ya cree.

**Aplicación ética:** usar sesgos para *ayudar* al usuario a tomar mejor decisión, no para manipularlo (dark pattern).

---

### 14. Occam's Razor
**Definición:** entre hipótesis que predicen igual, elegí la que asume menos.

**En UX:** la mejor solución de diseño es la que resuelve el problema con menos elementos, no la más elegante o innovadora.

**Test práctico:** ¿podés quitar este elemento? Si el flujo sigue funcionando, sacálo.

---

### 15. Pareto Principle (80/20)
**Definición:** el 80% de los efectos vienen del 20% de las causas.

**En UX:**
- 80% del uso viene del 20% de las features → priorizar esas.
- 80% de los bugs vienen del 20% del código → refactorizar esa zona.
- 80% de la fricción viene del 20% de las pantallas → auditarlas primero.

**Aplicado a SuperSurvey:** las inspecciones más frecuentes (probablemente draft survey y BQS) son el 20% que se usa el 80% del tiempo → esas pantallas deben ser las más pulidas.

---

## INTERACCIÓN Y MOTRICIDAD

### 16. Fitts's Law
**Definición:** el tiempo para hacer clic en un target es función de la distancia al target y su tamaño.

**Fórmula:** MT = a + b · log₂(D/W + 1) — MT: tiempo, D: distancia, W: ancho.

**Consecuencias prácticas:**
- **Targets grandes** son más rápidos (mínimo 44×44px en mobile, 48×48px es ideal).
- **Targets cercanos al cursor** son más rápidos.
- **Bordes de pantalla son "infinitos"** — el cursor se detiene ahí → poner acciones importantes en bordes (menú en top, dock en bottom).
- **Esquinas son las más rápidas** (2 bordes infinitos).

**Anti-patrón:** botones de 12×12px con mucho padding invisible; enlaces de texto sin área extendida.

**En RadFlow:** el botón "Copiar al WhatsApp" debe ser grande y en un borde, no un iconito de 16px en la esquina superior.

---

### 17. Jakob's Law
**Definición:** los usuarios pasan la mayoría del tiempo en OTROS sitios. Esperan que el tuyo funcione como los que ya conocen.

**Consecuencia:** ser innovador en patrones de interacción básicos es una mala idea. Ser convencional libera atención para lo que sí es único de tu producto.

**Lo que DEBE ser convencional:**
- Login (email + password, con "forgot password")
- Navegación (top nav horizontal o side nav)
- Checkout (steps + cart)
- Formularios (label arriba, input abajo, error debajo del input)
- Iconos (🔍 = búsqueda, 🛒 = carrito, ⚙ = settings)

**Lo que PODÉS innovar:** el core value único de tu producto, no el andamiaje.

---

### 18. Mental Model
**Definición:** modelo comprimido que el usuario tiene sobre cómo funciona un sistema.

**Regla:** cuando el mental model del usuario NO coincide con el modelo real del sistema, hay fricción.

**Solución:**
- Descubrir el mental model actual (research)
- O adaptar tu diseño al mental model (Jakob's Law)
- O enseñar el nuevo model con onboarding claro

**Ejemplo:** Gmail rompió el mental model de "carpetas" e impuso "labels" → funcionó porque el onboarding fue explícito, y el modelo real era mejor.

---

### 19. Paradox of the Active User
**Definición:** los usuarios NO leen manuales — empiezan a usar el software inmediatamente, aunque eso les cause errores.

**Consecuencia:** no confíes en documentación separada. La interfaz misma debe ser el manual.

**Soluciones:**
- Empty states informativos ("aún no tenés inspecciones, empezá creando una...")
- Tooltips contextuales
- Onboarding embebido en la primera tarea real
- Mensajes de error que expliquen y sugieran

---

## PERCEPCIÓN DEL TIEMPO Y EXPERIENCIA

### 20. Doherty Threshold
**Definición:** la productividad se dispara cuando la computadora y el usuario interactúan a un ritmo (<400ms) donde ninguno espera al otro.

**Umbrales críticos:**
- **<100ms:** se siente instantáneo (feedback de tap, hover).
- **<400ms:** se siente fluido (respuesta a acción).
- **>1s:** el usuario pierde flow, empieza a dudar.
- **>10s:** el usuario asume que se rompió.

**Aplicación:**
- Si algo tarda >1s, mostrar spinner o skeleton.
- Si tarda >3s, mostrar progreso con porcentaje.
- Optimistic updates cuando sea posible.

**En SuperSurvey (Tauri + Rust):** el Calculation Kernel debe responder <400ms. Si un cálculo pesado tarda más, ejecutar en background con spinner y permitir cancelar.

---

### 21. Flow
**Definición:** estado mental de inmersión, foco energético y disfrute total en una actividad (Csikszentmihalyi).

**Condiciones para flow:**
- Objetivos claros
- Feedback inmediato
- Balance entre desafío y habilidad
- Sin interrupciones

**Diseño para flow:**
- No mostrar notificaciones durante tareas críticas
- Autosave (que no piense en guardar)
- Undo confiable (que no tenga miedo de explorar)

---

### 22. Peak-End Rule
**Definición:** las personas juzgan una experiencia principalmente por su punto máximo (positivo o negativo) y por su final, NO por el promedio.

**Consecuencia:** invertir esfuerzo desproporcionado en:
- **El peak:** el momento "wow" del producto.
- **El end:** el cierre del flujo (confirmación, thank you page, mensaje de éxito).

**Ejemplos:**
- Duolingo: el peak es la racha; el end es el "¡completado!" con animación.
- Un checkout puede ser fricción pura, pero si la thank-you page es hermosa, la percepción global mejora.

**En RadFlow:** el "end" es el momento de generar el mensaje de WhatsApp → ese momento debe sentirse pulido, no un botón feo con "Copiado ✓".

---

### 23. Zeigarnik Effect
**Definición:** las personas recuerdan mejor las tareas incompletas o interrumpidas que las completadas.

**Aplicación positiva:** progreso visible (barras, checklists) genera compulsión sana por completar.

**Aplicación oscura (evitar):** cliffhangers artificiales, notificaciones de "tenés algo pendiente" cuando no es urgente.

**Ejemplo positivo:** LinkedIn "tu perfil está 80% completo" → efecto Zeigarnik + Goal-Gradient.

---

### 24. Goal-Gradient Effect
**Definición:** la tendencia a avanzar hacia una meta aumenta con la cercanía a la meta.

**Consecuencia:** el usuario acelera cuando ve que está cerca de terminar.

**Aplicación:**
- Progress bars en formularios largos → aumentan tasa de finalización.
- Punch cards con "una compra gratis a la 10ma" que ya vienen con 2 estampadas gratis → activa el efecto desde el inicio.

**En SuperSurvey:** ficha de inspección con "3 de 8 pasos completados" → el inspector completa más fichas cada día.

---

### 25. Parkinson's Law
**Definición:** cualquier tarea infla para llenar todo el tiempo disponible.

**Aplicación en UX:** poner deadlines o timers cuando aplique → aumenta la velocidad de acción.

**Ejemplos:**
- Booking.com "reservá en 5 minutos antes de que otro tome esta habitación" (ético cuando es real, dark pattern cuando es falso).
- Slots limitados de tiempo para reunión ("elegí uno de estos 3 horarios de 15 min").

---

## ATENCIÓN Y MEMORABILIDAD

### 26. Selective Attention
**Definición:** enfocamos atención solo en un subconjunto de estímulos, usualmente los relacionados con nuestro objetivo.

**Consecuencia clave:** **banner blindness** — el usuario ignora completamente elementos que parecen ads, aunque contengan info crítica.

**Aplicación:**
- No hacer que info importante parezca publicidad (evitar banners, pop-ups exagerados para mensajes reales).
- Un solo foco visual por pantalla — múltiples focos = ninguno.

---

### 27. Aesthetic-Usability Effect
**Definición:** los usuarios perciben interfaces estéticamente agradables como MÁS usables — aunque objetivamente no lo sean.

**Consecuencia:** invertir en estética no es decoración, es percepción de fiabilidad y calidad.

**Cuidado con el sesgo:** el equipo de diseño puede confundir "se ve bonito" con "funciona bien". Testear con usuarios reales, no solo mirar el mockup.

**En RadFlow (para Karol):** los 8 estilos visuales no son "decoración" — impactan la percepción del reporte y la confianza del médico receptor.

---

### 28. Von Restorff Effect (Isolation Effect)
**Definición:** cuando hay varios objetos similares, el que se diferencia se recuerda más.

**Aplicación:** un solo CTA con color de acento entre botones grises → el ojo lo encuentra en <100ms.

**Anti-patrón:** 5 botones todos coloridos = ninguno destaca (regresás a Selective Attention).

**Regla:** un elemento diferenciado por pantalla — máximo dos.

---

## SISTEMAS Y COMPLEJIDAD

### 29. Tesler's Law (Conservation of Complexity)
**Definición:** para cualquier sistema hay una cantidad de complejidad que NO se puede reducir. La pregunta es quién la absorbe: el usuario o el sistema.

**Aplicación:**
- Si un formulario tiene 20 campos legales requeridos, no podés reducirlos a 5 — pero SÍ podés reorganizarlos para que la carga cognitiva se sienta menor (chunking, defaults, autocompletado).
- El sistema debe absorber la complejidad que puede automatizar (cálculos, formato, validación).

**En SuperSurvey:** un cálculo VCF requiere temperatura, densidad, tabla ASTM correcta. El usuario NO debería elegir la tabla — el sistema decide según commodity.

---

### 30. Postel's Law (Robustness Principle)
**Definición:** sé liberal en lo que aceptás, conservador en lo que enviás.

**Aplicación en formularios:**
- Aceptar teléfonos con o sin guiones, con o sin país
- Aceptar mayúsculas/minúsculas en emails
- Normalizar del lado del sistema, no obligar al usuario

**Aplicación en APIs:** aceptar variaciones de entrada, siempre devolver formato consistente.

**Ejemplo:** buscador de Google acepta typos, singular/plural, mayúsculas → carga cero para el usuario.

---

## Combinaciones frecuentes

| Combo | Aplicación |
|---|---|
| Miller + Chunking + Serial Position | Diseño de menús y navegación |
| Fitts + Jakob + Von Restorff | Diseño de CTAs y acciones primarias |
| Hick + Choice Overload + Occam | Reducir opciones sin perder poder |
| Doherty + Flow + Zeigarnik | Apps de productividad y foco |
| Peak-End + Goal-Gradient + Aesthetic-Usability | Onboarding y checkout |
| Tesler + Postel + Cognitive Load | Simplificar formularios complejos |

---

## Anti-patrones comunes que violan varias leyes

1. **Mega-menú con 40 items** → viola Hick + Miller + Choice Overload
2. **Botón CTA de 12×12 en el medio de la pantalla** → viola Fitts + Selective Attention
3. **Formulario de 25 campos en una sola pantalla** → viola Miller + Chunking + Cognitive Load + Goal-Gradient
4. **Loading spinner de 8 segundos sin feedback** → viola Doherty + Flow
5. **Interfaz "innovadora" que renombra Login como "Ingreso Ceremonial"** → viola Jakob + Mental Model
6. **Todos los botones del mismo color** → viola Von Restorff + Law of Similarity mal aplicada

---

**Última nota:** estas leyes son **heurísticas, no verdades absolutas**. Siempre validar con usuarios reales cuando sea posible. Un mockup que "sigue todas las leyes" puede fallar en la práctica; un mockup "poco ortodoxo" puede funcionar excelente en su contexto específico.
