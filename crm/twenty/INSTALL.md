# Twenty CRM para Æterna — guía de instalación (self-hosted)

[Twenty](https://github.com/twentyhq/twenty) es un CRM open source (licencia AGPL-3.0), alternativa a Salesforce/HubSpot: empresas, personas, oportunidades (pipeline Kanban), tareas, notas, objetos y campos personalizados, workflows, API REST/GraphQL y webhooks, y sincronización con Gmail/Google Calendar y Microsoft 365.

Esta carpeta trae todo lo necesario para levantarlo con Docker, junto a la API del Site Auditor que ya vive en este repo:

| Archivo | Qué es |
|---|---|
| `docker-compose.yml` | Compose oficial de Twenty (`packages/twenty-docker`), con el puerto cambiado a **3001** y expuesto solo en `127.0.0.1` |
| `.env.example` | Variables de entorno comentadas en español, versión fijada a `v2.43.0` |
| `setup.sh` | Genera `.env` con contraseñas/llaves aleatorias y levanta todo |

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

## 2. Instalación rápida

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
3. En *Settings* configura el workspace (nombre, logo, idioma), invita a tu equipo y ajusta el modelo de datos (p. ej. campos para "Servicio de interés", "Presupuesto", "País" en Oportunidades/Empresas).

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

**Respaldo diario de la base** (agrégalo a `crontab -e`):

```bash
0 3 * * * cd /root/Aeterna/crm/twenty && docker compose exec -T db pg_dump -U postgres default | gzip > /root/backups/twenty-$(date +\%F).sql.gz
```

Respalda también el volumen `twenty_server-local-data` si usas `STORAGE_TYPE=local`.

**Actualizar**: Twenty solo soporta subir **de una versión *minor* a la siguiente** (v2.43 → v2.44, sin saltos). Por cada salto:

1. Respalda la base (`pg_dump`, arriba).
2. Cambia `TAG` en `.env` a la siguiente versión (lista en https://github.com/twentyhq/twenty/releases) y lee sus notas de upgrade.
3. `docker compose pull && docker compose up -d` — el `server` corre las migraciones al arrancar.

## 7. Integración con el resto de Æterna

- **API de Twenty** (Settings → APIs & Webhooks → crear API key): permite crear leads desde el widget del Site Auditor, el chatbot o formularios del sitio, p. ej. `POST https://crm.tu-dominio.com/rest/people` con `Authorization: Bearer <API_KEY>`.
- **Webhooks**: notifican cuando cambia una oportunidad (útil para n8n/Make/Zapier o automatizaciones propias).
- **Oferta a clientes**: el mismo compose sirve para desplegar un CRM por cliente PyME (un VPS o un workspace por cliente), como servicio gestionado de Æterna.

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| El login redirige mal o da error de CORS | `SERVER_URL` no coincide con la URL del navegador |
| `server` reinicia en bucle | Revisa `docker compose logs server`: suele ser `ENCRYPTION_KEY` vacía o credenciales de Postgres distintas a las del volumen existente |
| No llegan correos de invitación | SMTP no configurado o variables no descomentadas en `docker-compose.yml` |
| Puerto 3001 ocupado | Cambia `TWENTY_PORT` en `.env` y en el Caddyfile |
