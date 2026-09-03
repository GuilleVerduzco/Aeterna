# Guía paso a paso: desplegar la API y colocar el widget en tu sitio

Esta guía asume que quieres el resultado final: un servidor propio corriendo la API con HTTPS, y un cuadro de "Auditoría gratuita de tu sitio" en tu página web donde el visitante escribe su URL y ve los resultados en vivo.

## 1. Consigue un servidor (VPS)

Cualquier VPS con Docker sirve. Recomendado para empezar: **2 vCPU / 4 GB RAM** (cada auditoría lanza un navegador Chromium; con `MAX_CONCURRENT_ANALYSES=2` esto alcanza cómodo). Proveedores típicos: DigitalOcean, Hetzner, Linode, un droplet de AWS Lightsail, etc. Elige Ubuntu 22.04/24.04.

## 2. Apunta un subdominio al servidor

En tu proveedor de DNS (donde administras `c4b.mx` o el dominio que uses), crea un registro:

```
A   api-auditor.tu-dominio.com   →   <IP del VPS>
```

Vas a exponer la API en `https://api-auditor.tu-dominio.com`.

## 3. Instala Docker en el VPS

```bash
ssh root@<IP-del-VPS>
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
```

## 4. Clona el repo y configura el entorno

```bash
git clone https://github.com/GuilleVerduzco/Aeterna.git
cd Aeterna
cp .env.example .env
nano .env
```

En `.env`, como mínimo:

```bash
API_KEYS=                          # vacío: las rutas de análisis son públicas por diseño (ver README)
GOOGLE_PAGESPEED_API_KEY=tu_clave  # recomendado: https://developers.google.com/speed/docs/insights/v5/get-started
MAX_CONCURRENT_ANALYSES=2
ALLOW_PRIVATE_URLS=false           # NUNCA en true en un servidor expuesto a internet
```

## 5. Pon un reverse proxy con HTTPS automático delante (Caddy)

La forma más simple de tener TLS gratis y renovación automática. Instala Caddy:

```bash
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy
```

Edita `/etc/caddy/Caddyfile`:

```
api-auditor.tu-dominio.com {
  reverse_proxy localhost:3000
}
```

```bash
systemctl reload caddy
```

Caddy consigue el certificado TLS automáticamente la primera vez que alguien visite el subdominio.

## 6. Levanta la API

```bash
cd ~/Aeterna
docker compose up -d --build
curl http://localhost:3000/health   # {"status":"ok",...}
```

Verifica desde fuera: `curl https://api-auditor.tu-dominio.com/health`.

## 7. Prueba el flujo completo

```bash
curl -X POST https://api-auditor.tu-dominio.com/api/v1/analyses \
  -H "Content-Type: application/json" \
  -d '{"url":"https://tu-sitio.com"}'
# → {"id":"job_...", "eventsUrl": "/api/v1/analyses/job_.../events"}

curl -N https://api-auditor.tu-dominio.com/api/v1/analyses/job_.../events
# deberías ver los eventos category_completed llegando uno a uno
```

O simplemente abre `https://api-auditor.tu-dominio.com/public/audit.html` en el navegador — es la página de demo del widget, lista para usar tal cual.

## 8. Coloca el widget en tu sitio web

Copia este bloque donde quieras que aparezca el cuadro de auditoría (footer, landing, sección dedicada, etc.):

```html
<div id="aeterna-audit-widget"></div>
<link rel="stylesheet" href="https://api-auditor.tu-dominio.com/public/widget.css" />
<script>
  window.AETERNA_AUDIT_CONFIG = { apiBase: "https://api-auditor.tu-dominio.com" };
</script>
<script src="https://api-auditor.tu-dominio.com/public/widget.js" defer></script>
```

Dónde pegarlo según tu plataforma:

- **HTML a mano / sitio estático**: pégalo directo en el `.html` de la página, antes de `</body>`.
- **WordPress**: agrega un bloque "HTML personalizado" en el editor de páginas/Elementor, o pégalo en el footer del tema vía Apariencia → Editor de temas (o un plugin tipo "Insert Headers and Footers").
- **Webflow / Framer**: usa el componente de "Embed" / "Custom Code" y pega el mismo bloque.
- **Wix**: agrega un elemento "HTML iframe/Embed" (Wix corre el HTML dentro de un iframe, lo cual funciona igual de bien porque el widget es autocontenido).

No hace falta ningún build ni npm en tu sitio: es un `<script>` plano.

## 9. (Opcional) Deja el reporte HTML/PDF accesible

Los botones "Ver reporte completo" y "Descargar PDF" del widget apuntan a `https://api-auditor.tu-dominio.com/api/v1/analyses/{id}/report.html|pdf`. Esas URLs quedan disponibles ~1 hora después de generado el análisis (TTL configurado en `src/queue/jobQueue.ts`); si quieres conservarlos más tiempo o adjuntarlos a un email de seguimiento, descárgalos con `curl` en ese lapso y guárdalos donde prefieras (no hay integración de almacenamiento persistente todavía).

## Resumen de la arquitectura resultante

```
Visitante en tu-sitio.com
        │  escribe su URL en el widget
        ▼
tu-sitio.com (cualquier hosting)  ──JS/EventSource──▶  api-auditor.tu-dominio.com (VPS)
                                                              │
                                                        Caddy (HTTPS) → Fastify (Docker)
                                                              │
                                                   Playwright/Chromium analiza el sitio
                                                   ingresado en vivo (rendimiento, SEO,
                                                   accesibilidad, diseño, código/seguridad)
                                                              │
                                                   eventos SSE de vuelta al widget
                                                   en cuanto cada categoría termina
```

## 10. (Opcional) Gateway de modelos LLM con Claude Code Router

Si vas a agregar funciones con IA a la API (resúmenes ejecutivos, recomendaciones generadas por un
modelo, etc.), no llames a un proveedor directo desde el código: levanta
[Claude Code Router](https://github.com/musistudio/claude-code-router) (CCR) como sidecar. Te da un
endpoint local único (`http://ccr:3456` dentro de la red de Docker) desde el que enrutas a Anthropic,
OpenAI, Gemini, DeepSeek, etc., con failover, rotación de credenciales y logs de uso — todo sin
acoplar el código de la API a un proveedor específico.

```bash
docker compose --profile ai up -d --build ccr
```

Abre `http://<IP-del-VPS>:3458` (protégelo con el reverse proxy/firewall, no lo expongas público) para
configurar proveedores y reglas de enrutamiento. En `.env`, `LLM_GATEWAY_BASE_URL` ya apunta al
contenedor `ccr` por defecto; agrega tu `LLM_GATEWAY_API_KEY` si defines una clave de cliente en CCR.
Este servicio no se levanta con `docker compose up` normal (requiere el flag `--profile ai`) porque
hoy la API todavía no consume ningún modelo LLM.

## Costos y límites a tener en cuenta

- Cada auditoría abre un navegador Chromium real: es lo más pesado en CPU/RAM del sistema. `MAX_CONCURRENT_ANALYSES` limita cuántas corren a la vez; el resto espera en cola.
- El rate limit de 5 análisis/minuto por IP en `POST /api/v1/analyses` (además del límite global de 30/min) evita que alguien abuse del widget público para minar tu servidor o hacer scraping masivo a través de él.
- Si el tráfico crece mucho, lo primero en escalar es mover la cola en memoria a BullMQ + Redis (ver README) para poder correr varias instancias de la API detrás de un balanceador.
