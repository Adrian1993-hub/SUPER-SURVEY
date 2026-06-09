# /ui — Frontend de SuperSurvey (mockup BQS)

Frontend del proyecto: **React + TypeScript + Vite + Tailwind + shadcn/ui** (el stack de `03-TRD.md`).
Por ahora es un **mockup de diseño** del flujo **BQS** con **datos demo ficticios** (no hay lógica de
cálculo ni IPC todavía — eso vive en el kernel Rust).

> ⚠️ Todos los datos son ficticios (MT DEMO-01, Cliente Demo S.A., Puerto Demo). **Sin datos reales.**

## Correr

```bash
cd ui
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build      # build de producción
```

## Pantallas (flujo BQS, ver `docs/04-appflow.md`)

1. **Lista de trabajos** — `pages/ListaTrabajos.tsx`
2. **Cover / Configuración** — `pages/Cover.tsx`
3. **Perfiles** (Buque/Tanques · Cálculo · Tolerancia) — `pages/Perfiles.tsx`
4. **Key Meeting** — `pages/KeyMeeting.tsx`
5. **Medición** (grid pareado por tanque, *hero*) — `pages/Medicion.tsx`
6. **Cálculo + Trace** — `pages/CalculoTrace.tsx`
7. **Comparación** (NOAD/LOP) — `pages/Comparacion.tsx`
8. **Reporte** (BMR + export) — `pages/Reporte.tsx`

## Estructura

```
ui/
├─ src/
│  ├─ main.tsx · App.tsx        # entry + routing (8 rutas)
│  ├─ index.css                 # tema (tokens oklch) + Tailwind
│  ├─ lib/utils.ts              # cn()
│  ├─ components/ui/            # primitivos shadcn (sin radix, limpios)
│  ├─ components/               # AppSidebar · TopBar · EstadoBadge
│  ├─ data/demoJobs.ts          # datos demo ficticios
│  └─ pages/                    # las 8 pantallas
└─ (config: vite · tailwind · tsconfig · postcss)
```

## Notas de diseño

- **White-label:** marca neutra ("SuperSurvey"); el nombre/logo/colores saldrán de config (`branding/`).
- **Bilingüe:** UI en español (ES); pendiente i18n ES/EN.
- **Origen:** las 3 primeras pantallas nacieron en Magic Patterns y se portaron aquí; las 5 restantes
  se escribieron a mano en el mismo estilo.
- **Próximo (diseño):** versión más "cool / dinámica / visual" (ver issue de diseño en curso).
