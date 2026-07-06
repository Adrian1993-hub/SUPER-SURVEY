# Análisis — Asistente IA offline experto en inspecciones marítimas

> **Estado: ANÁLISIS y recomendación** (no implementación). Fase futura **F8**.
> Fuentes fechadas jul-2026; el ecosistema LLM se mueve rápido, así que los
> modelos concretos son **candidatos a verificar** en el momento de implementar,
> no una elección congelada.

## 0. Restricción doctrinal (innegociable)

El asistente es **consultivo**. **Las cifras oficiales de custodia salen SOLO del
kernel decimal trazable** (`supersurvey_calc`). La IA **nunca** genera ni “ajusta”
un número de cantidad/VCF/MT: explica, guía, redacta borradores y **cita fuentes**.
Esto es un requisito de defensibilidad legal, no una preferencia de diseño.

## 1. Casos de uso (rankeados por valor/riesgo)

1. **Guía de procedimiento** — “¿qué tabla ASTM aplica aquí?”, “¿qué sigue tras la
   medición?”. Alto valor, bajo riesgo (no toca cifras).
2. **Explicar el trace de cálculo** en lenguaje natural — el kernel ya produce el
   trace paso a paso; la IA lo **narra**, no lo recalcula.
3. **Borradores de documentos** — NOAD / LOP / cartas / Time Log a partir de datos
   ya calculados; el surveyor revisa y firma. Valor alto; riesgo medio (revisión
   humana obligatoria).
4. **Q&A sobre la doctrina y la base documental** (`docs/research/*`, normas) —
   onboarding de inspectores nuevos, dudas de método.
5. **Asistencia de captura** — detectar incoherencias (“densidad fuera de rango
   para este grado”) como *aviso*, nunca como corrección automática.

## 2. Arquitectura candidata (3 opciones)

| Opción | Cómo | Pros | Contras |
|---|---|---|---|
| **A. Sidecar Ollama** | proceso externo gestionado por Tauri; modelos GGUF | simple de integrar/actualizar; el usuario elige modelo; aislado del binario | dependencia externa a instalar; +proceso; gestión de ciclo de vida |
| **B. Embebido (llama.cpp vía crate Rust)** | el motor vive DENTRO del binario (`llama-cpp-2` u similar) | sin dependencias externas; un solo ejecutable; control total | binario mucho más pesado; recompilar para actualizar el runtime; build por plataforma más complejo |
| **C. Plugin/CLI descargable** | módulo IA opcional que se baja aparte | el instalador base queda ligero; IA es estrictamente opt-in | dos artefactos que versionar |

**Recomendación:** **A (sidecar Ollama) para el PoC** — la vía más rápida a valor y
la que no ensucia el instalador base; **C como forma de distribución** (el módulo
IA y el modelo se descargan post-instalación, nunca dentro del instalador). Dejar
**B** para una v2 si un cliente exige “un solo ejecutable, cero dependencias”.

## 3. Modelos candidatos (verificar licencias al implementar)

Todos en **GGUF**, cuantización de arranque **Q4_K_M** (subir a Q5_K_M si baja la
precisión). Preferir **licencias permisivas** para white-label comercial:

| Modelo | Tamaño | Licencia | RAM aprox (Q4) | Nota |
|---|---|---|---|---|
| **Phi-4-mini-instruct** | 3.8B | **MIT** | ~3–4 GB | contexto 128K, fuerte en razonamiento/RAG; licencia ideal |
| **SmolLM3-3B** | 3B | Apache-2.0 (totalmente abierto) | ~3 GB | muy abierto; bueno a escala 3B |
| **Qwen3 (≈4–8B)** | 4–8B | Apache-2.0 | ~3–6 GB | familia fuerte y permisiva |
| **Mistral Small** | ~7B | Apache-2.0 | ~5–6 GB | sólido; soberanía de datos UE |
| Gemma / Llama 3.x | 3–8B | licencia propia con condiciones | — | **revisar términos** antes de white-label comercial |

**Recomendación de arranque:** **Phi-4-mini (MIT, 3.8B)** por licencia + contexto
largo + tamaño que cabe en 8 GB. Un 7–8B Apache (Qwen3/Mistral) como opción “alta
calidad” para equipos con 16 GB.

## 4. RAG sobre nuestra base (cero servicios)

- **Corpus:** `docs/research/*` (blend, lpg, draft-survey, key-meeting, d1250,
  marine-fuel-grades…), doctrina (`docs/01…04`, `CONTEXT.md`, operaciones) y —
  **con permiso explícito** — datos del trabajo activo (SQLite).
- **Embeddings locales:** modelo GGUF pequeño de embeddings (p. ej. familia
  `nomic-embed`/`bge` en GGUF vía el mismo runtime) o `fastembed`.
- **Vector store:** **`sqlite-vec`** — es el sucesor mantenido de `sqlite-vss`,
  C puro sin dependencias, corre donde corra SQLite (incluida WASM). Encaja con la
  pila existente: **misma base SQLite**, cero infraestructura nueva (nada de
  Pinecone/Weaviate/FAISS).
- **Flujo:** trocear corpus → embeddings → tabla `vec` en la BD local → en cada
  pregunta, KNN top-k → prompt con esos fragmentos → respuesta **con citas** al
  documento fuente.

## 5. Guardrails

- **Sin cifras de custodia**: system prompt + validación de salida que impide que
  el asistente emita cantidades “oficiales”; si el usuario pide un número, se le
  redirige al kernel/trace.
- **Respuestas con cita** al fragmento del corpus; “no lo sé” cuando no hay
  soporte documental (anti-alucinación).
- **Disclaimer visible** (“asistente consultivo; verifica contra el cálculo”).
- **Todo offline**: sin telemetría, sin salida de datos del equipo. Log de
  conversación **opcional y local** para auditoría.

## 6. Impacto en requisitos (alimenta `docs/requisitos-minimos.md`)

| | Sin IA | Con IA 3–4B Q4 | Con IA 7–8B Q4 |
|---|---|---|---|
| RAM recomendada | 8 GB | **16 GB** | 16 GB |
| Disco adicional | — | +2–3 GB (modelo) | +4–5 GB |
| CPU | 4 núcleos | 4–8 núcleos (o GPU opcional) | 8 núcleos / GPU |

El modelo se **descarga post-instalación**; **nunca** viaja en el instalador base.

## 7. Recomendación final + fases F8

1. **F8.1 PoC (sidecar Ollama + Phi-4-mini + sqlite-vec)**: panel lateral
   “Asistente” en la UI (solo escritorio), RAG sobre `docs/research/*`, guardrails
   de “sin cifras”. Medir utilidad real con 2–3 inspectores.
2. **F8.2 Evaluación**: casos de uso 1–4 con inspectores reales; afinar prompts,
   corpus y citas; medir RAM/latencia en equipos objetivo.
3. **F8.3 Integración**: distribución como módulo descargable (opción C), tier de
   requisitos “con IA”, y decisión Ollama-sidecar vs. embebido según feedback.

**Riesgo/decisión abierta:** confirmar en el momento de implementar (a) licencia
exacta del modelo elegido para uso comercial white-label, y (b) si el cliente
acepta el sidecar Ollama o exige un único ejecutable (empujaría a la opción B).

---

### Fuentes (jul-2026)
- [Best Open-Source Small Language Models (SLMs) 2026 — BentoML](https://www.bentoml.com/blog/the-best-open-source-small-language-models)
- [Best Open Source LLMs 2026: licenses & deployment — AceCloud](https://acecloud.ai/blog/best-open-source-llms/)
- [Open-source/-weight LLMs to run locally 2026 — Hugging Face](https://huggingface.co/blog/daya-shankar/open-source-llm-models-to-run-locally)
- [sqlite-vec (repo, sucesor de sqlite-vss)](https://github.com/asg017/sqlite-vec)
- [The State of Vector Search in SQLite — M. Bambini](https://marcobambini.substack.com/p/the-state-of-vector-search-in-sqlite)
- [Local-First RAG: Vector Search in SQLite — SitePoint](https://www.sitepoint.com/local-first-rag-vector-search-in-sqlite-with-hamming-distance/)
