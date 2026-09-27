# Twenty CRM para Æterna — guía de instalación (self-hosted)

[Twenty](https://github.com/twentyhq/twenty) es un CRM open source (licencia AGPL-3.0), alternativa a Salesforce/HubSpot: empresas, personas, oportunidades (pipeline Kanban), tareas, notas, objetos y campos personalizados, workflows, API REST/GraphQL y webhooks, y sincronización con Gmail/Google Calendar y Microsoft 365.

Esta carpeta trae todo lo necesario para levantarlo con Docker, junto a la API del Site Auditor que ya vive en este repo:

| Archivo | Qué es |
|---|---|
| `docker-compose.yml` | Compose oficial de Twenty (`packages/twenty-docker`), con el puerto cambiado a **3001** y expuesto solo en `127.0.0.1` |
| `.env.example` | Variables de entorno comentadas en español, versión fijada a `v2.43.0` |
| `setup.sh` | Genera `.env` con contraseñas/llaves aleatorias y levanta todo |
| `install-vps.sh` | Instalación completa en un VPS Ubuntu/Debian: Docker + Twenty + HTTPS (Caddy) + respaldo diario |
| `configure-aeterna.py` | Deja el workspace listo para Æterna: pipeline en español y campos de agencia (vía API) |
| `backup.sh` | Respaldo de base de datos, adjuntos y `.env`, con retención de 14 días |

## Qué se levanta

| Servicio | Imagen | Función |
|---|---|---|
| `server` | `twentycrm/twenty` | Backend + frontend web (puerto interno 3000 → host 3001). Corre las migraciones al arrancar |
| `worker` | `twentycrm/twenty` | Trabajos en segundo plano: sincronizar correos/calendario, workflows, webhooks |
| `db` | `postgres:16` | Base de datos (volumen `db-data`) |
| `redis` | `redis` | Cola de trabajos y caché |

## 1. Requisitos

- Servidor Linux (Ubuntu 22.04/24.04) con **mínimo 2 GB de RAM** (recomendado 4 GB; si también corre el Site Auditor en el mismo VPS, **4–8 GB**) y ~10 GB de disco.
- Docker + plugin `docker compose` v2:
  ```bash
  curl -fsSL https://get.docker.com | sh
  apt-get install -y docker-compose-plugin
  ```
- Un subdominio apuntando al servidor, p. ej. `A  crm.tu-dominio.com → <IP del VPS>`.

**HostGator México**: el hosting compartido (planes web con cPanel) **no sirve**: no da acceso root ni permite Docker. Sí sirve un **VPS NVMe 4 o superior** con la opción **«SO simple» + Ubuntu 22.04**. No elijas las variantes con cPanel ni n8n: ocupan los puertos 80/443 (Apache/Traefik) y chocan con Caddy. HostGator no respalda los VPS, así que `backup.sh` + copia externa es obligatorio. El DNS del subdominio se crea en el cPanel del hosting actual (*Zone Editor → + A Record*), si el dominio usa los nameservers de HostGator.

## 2. Instalación en un VPS (un comando)

Con el DNS ya apuntando al servidor, como root:

```bash
git clone https://github.com/GuilleVerduzco/Aeterna.git /opt/aeterna
cd /opt/aeterna/crm/twenty
./install-vps.sh crm.tu-dominio.com
```

Instala Docker si falta, levanta Twenty con `https://crm.tu-dominio.com`, agrega el sitio a Caddy (lo instala si falta; si ya tienes Caddy por `DEPLOY.md`, solo agrega el bloque) y programa `backup.sh` diario a las 03:17. Se puede volver a correr sin duplicar nada. Después continúa en **4. Primer acceso**.

Las secciones 2b y 3 describen lo mismo paso a paso, por si prefieres hacerlo a mano o no usas Ubuntu/Debian.

## 2b. Instalación manual

```bash
git clone https://github.com/GuilleVerduzco/Aeterna.git
cd Aeterna/crm/twenty
./setup.sh https://crm.tu-dominio.com     # o sin argumento para probar en local (http://localhost:3001)
```

`setup.sh` crea `.env` con una contraseña de Postgres y una `ENCRYPTION_KEY` aleatorias, corre `docker compose up -d` y espera a que los contenedores estén sanos (el primer arranque tarda 2–5 min por las migraciones).

> **Respalda `.env`** (sobre todo `ENCRYPTION_KEY`) fuera del servidor. Sin esa llave no se pueden descifrar los tokens de las cuentas conectadas.

### Instalación manual (equivalente)

```bash
cp .env.example .env
openssl rand -base64 32        # pégalo en ENCRYPTION_KEY
openssl rand -hex 24           # pégalo en PG_DATABASE_PASSWORD
nano .env                      # ajusta SERVER_URL
docker compose up -d
docker compose logs -f server  # espera a ver que el servidor escucha
```

## 3. HTTPS con Caddy

Si ya seguiste `DEPLOY.md` para la API, Caddy ya está instalado. Solo agrega otro bloque a `/etc/caddy/Caddyfile`:

```
crm.tu-dominio.com {
  reverse_proxy localhost:3001
}
```

```bash
systemctl reload caddy
```

`SERVER_URL` en `.env` debe ser exactamente `https://crm.tu-dominio.com`. Si lo cambias: `docker compose up -d` para aplicarlo.

## 4. Primer acceso

1. Abre `https://crm.tu-dominio.com`.
2. Regístrate con correo y contraseña: **el primer usuario crea el workspace y queda como administrador**.
   El onboarding pide nombre del workspace (p. ej. «Æterna»), tu perfil e invitar al equipo (se puede omitir).
3. Idioma: cada usuario lo cambia en *Settings → Experience → Language* (hay Español).
4. Crea una API key: *Settings → MCP & APIs → pestaña API → Create API key*, rol **Admin**. Cópiala: solo se muestra una vez.
5. Configura el workspace para Æterna:
   ```bash
   TWENTY_API_KEY=<la key> python3 configure-aeterna.py --url https://crm.tu-dominio.com --limpiar-demo
   ```
   - **Pipeline de Oportunidades**: Nuevo lead → Diagnóstico → Reunión → Propuesta enviada → Negociación → Cliente → Perdido.
   - **Oportunidad**: *Servicio de interés* (marketing digital, sitio web, tienda en línea, redes sociales, chatbot/IA, automatización, consultoría), *Fuente del lead* (Site Auditor, sitio web, chatbot, WhatsApp, redes, anuncios, referido, evento) y *Tipo de contrato* (proyecto único / iguala mensual).
   - **Empresa**: *País* (LATAM), *Score sitio web* y *Reporte de auditoría* (para el Site Auditor).
   - `--limpiar-demo` borra las empresas, personas y oportunidades de ejemplo (Airbnb, Stripe…) que Twenty crea al inicio; no toca registros creados por personas o por la API.

   El script es idempotente: si lo vuelves a correr no duplica nada. Para cambiar opciones o agregar campos, edita `CUSTOM_FIELDS` en el script o hazlo desde *Settings → Data model*.

## 5. Opcionales recomendados

Para cada variable opcional: ponla en `.env` **y** descomenta la línea correspondiente en `docker-compose.yml` (en `server` y `worker`), luego `docker compose up -d`.

**Correo saliente (SMTP)** — necesario para invitaciones y restablecer contraseñas. Con Gmail usa una *contraseña de aplicación* (requiere verificación en 2 pasos): `EMAIL_DRIVER=smtp`, `EMAIL_SMTP_HOST=smtp.gmail.com`, `EMAIL_SMTP_PORT=465`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`.

**Google (login + Gmail + Calendar)**:
1. En Google Cloud Console crea un proyecto, habilita **Gmail API**, **Google Calendar API** y **People API**.
2. Crea credenciales OAuth (aplicación web) con estos *redirect URIs*:
   - `https://crm.tu-dominio.com/auth/google/redirect`
   - `https://crm.tu-dominio.com/auth/google-apis/get-access-token`
3. Llena `AUTH_GOOGLE_*`, `MESSAGING_PROVIDER_GMAIL_ENABLED=true`, `CALENDAR_PROVIDER_GOOGLE_ENABLED=true`.

**Almacenamiento S3** — para adjuntos fuera del servidor (S3, Cloudflare R2, DO Spaces): `STORAGE_TYPE=s3` y las variables `STORAGE_S3_*`.

La lista completa de variables está en la documentación oficial: https://twenty.com/developers (sección *Self-hosting*).

## 6. Operación

```bash
docker compose ps                 # estado
docker compose logs -f server     # logs (también: worker, db)
docker compose restart            # reiniciar
docker compose down               # detener (los datos quedan en los volúmenes)
```

**Respaldos**: `./backup.sh [/var/backups/twenty]` guarda en ese directorio el dump de Postgres (`twenty-db-*.sql.gz`), los adjuntos (`twenty-files-*.tar.gz`) y una copia de `.env` (`twenty-env-*`), y borra los de más de `RETENTION_DAYS` (14) días. `install-vps.sh` ya lo deja en cron; a mano:

```bash
17 3 * * * /opt/aeterna/crm/twenty/backup.sh /var/backups/twenty >> /var/log/twenty-backup.log 2>&1
```

Copia los respaldos **fuera del VPS** (p. ej. `rclone` a Google Drive o S3): si el servidor se pierde, los respaldos se pierden con él.

**Restaurar** (en un servidor nuevo o tras un desastre). Usa el `.env` del respaldo: la `ENCRYPTION_KEY` debe ser la misma.

```bash
cd /opt/aeterna/crm/twenty
cp /var/backups/twenty/twenty-env-<FECHA> .env
docker compose down -v                       # ⚠️ borra lo que haya en esta instancia
docker compose up -d --wait db
zcat /var/backups/twenty/twenty-db-<FECHA>.sql.gz | docker compose exec -T db psql -q -U postgres default
docker compose run --rm --no-deps -T -v /var/backups/twenty:/bk --entrypoint sh server \
  -c 'tar -C /app/packages/twenty-server/.local-storage -xzf /bk/twenty-files-<FECHA>.tar.gz'
docker compose up -d --wait
```

**Actualizar**: Twenty solo soporta subir **de una versión *minor* a la siguiente** (v2.43 → v2.44, sin saltos). Por cada salto:

1. Respalda (`./backup.sh`).
2. Cambia `TAG` en `.env` a la siguiente versión (lista en https://github.com/twentyhq/twenty/releases) y lee sus notas de upgrade.
3. `docker compose pull && docker compose up -d` — el `server` corre las migraciones al arrancar.

## 7. Integración con el resto de Æterna

- **API de Twenty** (*Settings → MCP & APIs*): permite crear leads desde el widget del Site Auditor, el chatbot o formularios del sitio. Con los campos de `configure-aeterna.py`:
  ```bash
  curl -X POST https://crm.tu-dominio.com/rest/opportunities \
    -H "Authorization: Bearer $TWENTY_API_KEY" -H "Content-Type: application/json" \
    -d '{"name":"Rediseño web + chatbot","stage":"NEW","fuente":"SITE_AUDITOR",
         "servicio":["SITIO_WEB","CHATBOT_IA"],"companyId":"<id de /rest/companies>"}'
  ```
- **MCP**: Twenty expone un servidor MCP (*Settings → MCP & APIs → MCP*) para consultar y actualizar el CRM desde Claude.
- **Webhooks**: notifican cuando cambia una oportunidad (útil para n8n/Make/Zapier o automatizaciones propias).
- **Oferta a clientes**: el mismo compose sirve para desplegar un CRM por cliente PyME (un VPS o un workspace por cliente), como servicio gestionado de Æterna.

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| El login redirige mal o da error de CORS | `SERVER_URL` no coincide con la URL del navegador |
| `server` reinicia en bucle | Revisa `docker compose logs server`: suele ser `ENCRYPTION_KEY` vacía o credenciales de Postgres distintas a las del volumen existente |
| No llegan correos de invitación | SMTP no configurado o variables no descomentadas en `docker-compose.yml` |
| Puerto 3001 ocupado | Cambia `TWENTY_PORT` en `.env` y en el Caddyfile |
