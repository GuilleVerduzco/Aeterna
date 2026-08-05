# Æterna Site Auditor API

API para auditorías profundas de sitios web: **rendimiento**, **SEO técnico**, **accesibilidad (WCAG)**, **diseño/UX** y **código/seguridad**, con resultados en JSON y reportes visuales HTML/PDF con la identidad de marca de Æterna.

## Stack

- **Node.js 20+ / TypeScript**, servidor **Fastify**.
- **Playwright (Chromium)** para el crawling real del sitio: HTML renderizado, screenshots responsive (mobile/tablet/desktop), consola del navegador, requests de red, timings.
- **Google PageSpeed Insights API** (Lighthouse + datos de campo CrUX de Google) como motor principal de rendimiento; si no hay `GOOGLE_PAGESPEED_API_KEY`, cae automáticamente a una heurística local basada en la propia captura de red.
- **axe-core** para accesibilidad (WCAG 2.1/2.2).
- **cheerio** para el análisis SEO del HTML.
- **html-validate** para validación de marcado.
- Cola de trabajos en memoria con concurrencia limitada (`p-limit`), pensada para sustituirse por BullMQ + Redis si se necesita escalar horizontalmente.

## Categorías de análisis

| Categoría | Qué revisa |
|---|---|
| `performance` | Core Web Vitals (LCP, CLS, INP, FCP), oportunidades de Lighthouse, peso de página, recursos bloqueantes |
| `seo` | title/meta description, canonical, viewport, jerarquía de encabezados, alt text, Open Graph, JSON-LD, robots.txt, sitemap.xml, enlaces rotos, HTTPS |
| `accessibility` | Violaciones WCAG detectadas por axe-core (contraste, ARIA, landmarks, atributos requeridos, etc.) |
| `design` | Consistencia tipográfica y de color, contraste de texto (WCAG AA/AAA), desbordamiento horizontal por viewport |
| `code_security` | Headers de seguridad HTTP, contenido mixto, source maps expuestos, librerías JS desactualizadas, errores de consola, validación HTML, peso de JS |

Cada hallazgo incluye severidad (`critical`/`high`/`medium`/`low`/`info`), descripción, recomendación accionable y evidencia. Cada categoría tiene un score 0-100; el score general es un promedio ponderado.

## Quickstart

```bash
cp .env.example .env
# Opcional pero recomendado: agrega tu GOOGLE_PAGESPEED_API_KEY para datos reales de Google
npm install
npm run playwright:install   # descarga Chromium para Playwright (una sola vez)
npm run dev
```

La API queda disponible en `http://localhost:3000`, con documentación OpenAPI interactiva en `http://localhost:3000/docs`.

### Con Docker

```bash
cp .env.example .env
docker compose up --build
```

## Uso de la API

### 1. Encolar una auditoría

```bash
curl -X POST http://localhost:3000/api/v1/analyses \
  -H "Content-Type: application/json" \
  -H "x-api-key: TU_API_KEY" \
  -d '{
        "url": "https://ejemplo.com",
        "categories": ["performance", "seo", "accessibility", "design", "code_security"],
        "screenshots": true,
        "maxLinksChecked": 25
      }'
```

Respuesta (`202 Accepted`):

```json
{ "id": "job_abc123", "status": "queued", "statusUrl": "/api/v1/analyses/job_abc123" }
```

Todos los campos del body son opcionales salvo `url`. Por defecto se analizan todas las categorías con screenshots activados.

### 2. Consultar estado / resultado

```bash
curl http://localhost:3000/api/v1/analyses/job_abc123 -H "x-api-key: TU_API_KEY"
```

`status` es uno de `queued` | `running` | `completed` | `failed`. Cuando está `completed`, el objeto incluye `result` con el JSON completo (`overallScore`, `categories[]`, `screenshots[]`, `errors[]`).

### 3. Obtener el reporte visual

```bash
curl http://localhost:3000/api/v1/analyses/job_abc123/report.html -H "x-api-key: TU_API_KEY" -o reporte.html
curl http://localhost:3000/api/v1/analyses/job_abc123/report.pdf  -H "x-api-key: TU_API_KEY" -o reporte.pdf
```

## Autenticación

Si `API_KEYS` está definido en el entorno (una o varias claves separadas por coma), todas las rutas excepto `/health` y `/docs` requieren el header `x-api-key`. Si se deja vacío, la autenticación queda deshabilitada (solo recomendable en desarrollo local).

## Variables de entorno

Ver `.env.example`. Las más relevantes:

- `GOOGLE_PAGESPEED_API_KEY` — habilita datos reales de Google (Lighthouse + CrUX) para la categoría de rendimiento.
- `MAX_CONCURRENT_ANALYSES` — cuántas auditorías (cada una lanza un navegador Chromium) corren en paralelo.
- `ANALYSIS_TIMEOUT_MS` — tiempo máximo por auditoría.
- `CHROMIUM_EXECUTABLE_PATH` — útil en entornos con un Chromium ya instalado en una ruta distinta a la gestionada por Playwright.

## Tests

```bash
npm test
```

Cubren el motor de scoring, utilidades de contraste WCAG y la lógica de los analizadores de SEO, diseño y código/seguridad de forma aislada (sin depender de red ni de un navegador real).

## Arquitectura

```
src/
  analyzers/       crawler (Playwright) + un analizador por categoría + orquestador
  scoring/         cálculo del score general ponderado
  report/          template HTML de marca Æterna + render a PDF
  queue/           cola de jobs en memoria
  routes/          endpoints Fastify (health, analyses)
  lib/             utilidades (contraste WCAG, HTTP, ids, logger)
  config.ts        configuración desde variables de entorno
  app.ts            construcción de la app Fastify (plugins, auth, swagger)
  server.ts         punto de entrada
```

Cada análisis: (1) el crawler carga la página una sola vez con Playwright, capturando HTML, red, consola, estilos computados y screenshots; (2) los cinco analizadores corren en paralelo sobre esa misma captura (más una llamada a Google PageSpeed Insights si hay API key); (3) se agregan los hallazgos y se calcula el score.

## Escalar a producción

- Sustituir la cola en memoria (`src/queue/jobQueue.ts`) por BullMQ + Redis si se necesita más de una instancia.
- El Dockerfile usa la imagen oficial `mcr.microsoft.com/playwright`, que ya trae Chromium y sus dependencias del sistema.
- Cada auditoría lanza un navegador headless: dimensiona `MAX_CONCURRENT_ANALYSES` según CPU/RAM disponibles.

---

Æterna · Microservicios IA · [c4b.mx](https://www.c4b.mx) · info@c4b.mx
