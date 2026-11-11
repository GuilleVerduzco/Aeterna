---
name: aeterna-site-auditor
description: Guía de arquitectura y convenciones del Æterna Site Auditor API (auditorías de rendimiento, SEO, accesibilidad, diseño y código/seguridad). Usar al agregar o modificar un analizador, tocar el pipeline de análisis (crawler → analizadores → scoring → reporte), el widget embebible, o las rutas/eventos SSE de /api/v1/analyses.
---

# Æterna Site Auditor API

API en Node.js/TypeScript (Fastify) que audita sitios web en 5 categorías:
`performance`, `seo`, `accessibility`, `design`, `code_security`. Ver `README.md`
para la documentación de producto (uso de la API, widget, deploy); esta skill
cubre cómo está construido el pipeline internamente.

## Flujo de una auditoría

1. **Crawl único** (`src/analyzers/crawler.ts`): Playwright abre la URL una sola
   vez y captura HTML renderizado, screenshots responsive (mobile/tablet/desktop),
   consola del navegador, requests de red, timings, estilos computados y
   resultados de axe-core inyectado.
2. **Analizadores en paralelo** (`src/analyzers/index.ts`, función `runAnalysis`):
   cada categoría solicitada corre sobre la misma captura del crawl (más una
   llamada a Google PageSpeed Insights para `performance` si hay API key).
   Cada analizador se ejecuta con `runSafely`: si falla, no tumba el resto —
   se agrega su mensaje a `errors[]` y se emite `category_failed`.
3. **Scoring** (`src/scoring/score.ts`): agrega los `CategoryResult` en un
   `overallScore` 0-100 ponderado.
4. **Reporte** (`src/report/`): `htmlTemplate.ts` arma el HTML con la marca
   Æterna, `pdfRenderer.ts` lo convierte a PDF.
5. **Progreso en vivo**: `runAnalysis` acepta un callback `onEvent` que las
   rutas (`src/routes/analyses.ts`) reenvían como Server-Sent Events
   (`crawl_started`, `crawl_completed`, `category_completed`,
   `category_failed`, `job_completed`, `job_failed`).

## Contrato de un analizador

Todo analizador de categoría devuelve un `CategoryResult` (`src/types/index.ts`):

```ts
interface CategoryResult {
  category: Category;
  score: number; // 0-100
  findings: Finding[];
  metrics: Record<string, unknown>;
}
```

Cada `Finding` lleva `severity` (`critical|high|medium|low|info`), `title`,
`description`, `recommendation` accionable y opcionalmente `target`/`evidence`.

### Agregar una categoría o analizador nuevo

1. Crear `src/analyzers/<nombre>.ts` con una función `analyze<Nombre>(...)` que
   reciba lo que ya capturó el crawler (no vuelvas a navegar/crawlear).
2. Agregar el valor a `Category` y `ALL_CATEGORIES` en `src/types/index.ts`.
3. Registrar la rama correspondiente en `runAnalysis` (`src/analyzers/index.ts`),
   envuelta en `runSafely`.
4. Sumar su ponderación en `src/scoring/score.ts`.
5. Escribir tests aislados (sin red/browser real) en `test/`, siguiendo el
   patrón de los analizadores existentes.

## Convenciones del repo

- **ESM + TypeScript estricto**: imports internos siempre con extensión `.js`
  (aunque el archivo fuente sea `.ts`), por `"type": "module"` en package.json.
- **Seguridad primero**: cualquier código que reciba una URL de usuario debe
  pasar por el guard anti-SSRF (`src/lib/ssrf.ts`) antes de hacer fetch/crawl.
  No lo bypasees salvo detrás de `ALLOW_PRIVATE_URLS` (solo dev).
- **Sin llamadas de red en tests**: los tests (`npm test`, Vitest) cubren
  scoring, utilidades de contraste WCAG y lógica de analizadores de forma
  aislada — no dependen de Playwright ni de red real. Mantén esa propiedad al
  añadir tests nuevos.
- **Logger**: usar `src/lib/logger.ts` (pino) en vez de `console.log`.
- **Identidad de marca**: cualquier salida visual (reporte HTML/PDF, widget en
  `public/`) debe seguir la identidad de marca de Æterna — si el proyecto
  Claude tiene disponible la skill `aeterna-brand`, consúltala para colores/
  tipografía antes de tocar `src/report/htmlTemplate.ts` o `public/widget.css`.

## Comandos útiles

```bash
npm run dev              # servidor con reload (tsx watch)
npm run lint              # tsc --noEmit
npm test                 # vitest run
npm run playwright:install  # descarga Chromium (una sola vez)
```
