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
- (Opcional) [Claude Code Router](https://github.com/musistudio/claude-code-router) como gateway de modelos LLM, para cuando se agreguen funciones con IA (ver [DEPLOY.md](DEPLOY.md#10-opcional-gateway-de-modelos-llm-con-claude-code-router)).

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
{
  "id": "job_abc123",
  "status": "queued",
  "statusUrl": "/api/v1/analyses/job_abc123",
  "eventsUrl": "/api/v1/analyses/job_abc123/events"
}
```

Todos los campos del body son opcionales salvo `url`. Por defecto se analizan todas las categorías con screenshots activados. La URL pasa primero por un guard anti-SSRF (`src/lib/ssrf.ts`) que rechaza IPs privadas/loopback/metadata de nube.

### 2. Seguir el progreso en tiempo real (Server-Sent Events)

```bash
curl -N http://localhost:3000/api/v1/analyses/job_abc123/events
```

Emite un evento en cuanto cada pieza termina, **sin esperar a que acabe todo el análisis**:

```
event: crawl_completed
data: {"type":"crawl_completed","finalUrl":"https://ejemplo.com/","screenshots":[...]}

event: category_completed
data: {"type":"category_completed","result":{"category":"performance","score":92,"findings":[...],"metrics":{...}}}

event: category_completed
data: {"type":"category_completed","result":{"category":"seo","score":78,...}}

...

event: job_completed
data: {"type":"job_completed","result":{"id":"job_abc123","overallScore":81,"categories":[...],...}}
```

Un cliente que se conecta después de que ya corrieron algunas categorías recibe primero el historial completo y luego los eventos en vivo — no se pierde nada. Esto es lo que usa el widget embebible para pintar cada categoría en cuanto está lista (ver más abajo).

### 3. Consultar estado / resultado (polling, alternativa a SSE)

```bash
curl http://localhost:3000/api/v1/analyses/job_abc123 -H "x-api-key: TU_API_KEY"
```

`status` es uno de `queued` | `running` | `completed` | `failed`. Cuando está `completed`, el objeto incluye `result` con el JSON completo (`overallScore`, `categories[]`, `screenshots[]`, `errors[]`).

### 4. Obtener el reporte visual

```bash
curl http://localhost:3000/api/v1/analyses/job_abc123/report.html -o reporte.html
curl http://localhost:3000/api/v1/analyses/job_abc123/report.pdf  -o reporte.pdf
```

## Widget embebible para tu sitio web

`public/widget.js` + `public/widget.css` son un widget vanilla-JS (sin dependencias) con la identidad de marca de Æterna: input de URL, progreso en vivo por categoría vía SSE, score final y links al reporte. Se sirven directamente desde la propia API en `/public/*`.

Para incrustarlo en cualquier sitio (WordPress, Webflow, HTML a mano, lo que sea), agrega esto donde quieras que aparezca:

```html
<div id="aeterna-audit-widget"></div>
<link rel="stylesheet" href="https://tu-api.tu-dominio.com/public/widget.css" />
<script>
  window.AETERNA_AUDIT_CONFIG = { apiBase: "https://tu-api.tu-dominio.com" };
</script>
<script src="https://tu-api.tu-dominio.com/public/widget.js" defer></script>
```

También hay una página de demo lista para usar en `/public/audit.html` (útil como landing standalone o para incrustar por `<iframe>`).

**Nota de seguridad importante:** las rutas `/api/v1/analyses*` son públicas por diseño (no requieren `x-api-key`), porque el widget las llama directamente desde el navegador del visitante — una API key en JS del cliente nunca es realmente secreta. En su lugar se protegen con: guard anti-SSRF, rate limit específico de 5 solicitudes/minuto por IP en la creación de análisis (además del límite global de 30/min), y CORS abierto para que cualquier sitio pueda incrustar el widget. Si además necesitas una API privada para uso interno/programático, despliega una segunda instancia con `API_KEYS` definido.

## Autenticación

`API_KEYS` (una o varias claves separadas por coma) protege todo excepto `/health`, `/docs`, `/public/*` y `/api/v1/analyses*` (ver nota de seguridad arriba — estas últimas son el producto público). Si se deja vacío, la autenticación queda deshabilitada.

## Variables de entorno

Ver `.env.example`. Las más relevantes:

- `GOOGLE_PAGESPEED_API_KEY` — habilita datos reales de Google (Lighthouse + CrUX) para la categoría de rendimiento.
- `MAX_CONCURRENT_ANALYSES` — cuántas auditorías (cada una lanza un navegador Chromium) corren en paralelo.
- `ANALYSIS_TIMEOUT_MS` — tiempo máximo por auditoría.
- `CHROMIUM_EXECUTABLE_PATH` — útil en entornos con un Chromium ya instalado en una ruta distinta a la gestionada por Playwright.
- `ALLOW_PRIVATE_URLS` — **peligroso, solo desarrollo local**: desactiva el guard anti-SSRF. Nunca en producción.

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
  queue/           cola de jobs en memoria + EventEmitter de progreso por job
  routes/          endpoints Fastify (health, analyses, events SSE)
  lib/             utilidades (contraste WCAG, HTTP, ids, logger, guard SSRF)
  config.ts        configuración desde variables de entorno
  app.ts            construcción de la app Fastify (plugins, auth, swagger, estáticos)
  server.ts         punto de entrada
public/
  widget.js        widget embebible (vanilla JS, sin dependencias)
  widget.css        estilos con la identidad de marca de Æterna
  audit.html         página de demo / hosting standalone del widget
```

Cada análisis: (1) el crawler carga la página una sola vez con Playwright, capturando HTML, red, consola, estilos computados y screenshots; (2) los cinco analizadores corren en paralelo sobre esa misma captura (más una llamada a Google PageSpeed Insights si hay API key); (3) se agregan los hallazgos y se calcula el score.

## Desplegarla y ponerla en tu sitio web

Guía paso a paso completa (VPS + Docker + HTTPS + cómo pegar el widget en cualquier plataforma) en [`DEPLOY.md`](./DEPLOY.md).

## Escalar a producción

- Sustituir la cola en memoria (`src/queue/jobQueue.ts`) por BullMQ + Redis si se necesita más de una instancia.
- El Dockerfile usa la imagen oficial `mcr.microsoft.com/playwright`, que ya trae Chromium y sus dependencias del sistema.
- Cada auditoría lanza un navegador headless: dimensiona `MAX_CONCURRENT_ANALYSES` según CPU/RAM disponibles.

---

Æterna · Microservicios IA · [c4b.mx](https://www.c4b.mx) · info@c4b.mx
