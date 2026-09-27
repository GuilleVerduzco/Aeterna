#!/usr/bin/env bash
# Instalación completa de Twenty en un VPS Ubuntu/Debian limpio, como root:
#   Docker + Twenty (setup.sh) + HTTPS con Caddy + respaldo diario a las 03:17.
# Uso:  sudo ./install-vps.sh crm.tu-dominio.com
# Antes: el registro DNS  A crm.tu-dominio.com → IP del VPS  debe existir (Caddy lo necesita para el certificado).
set -euo pipefail
cd "$(dirname "$0")"
here=$(pwd)

domain=${1:-}
[ -n "$domain" ] || { echo "Uso: sudo $0 crm.tu-dominio.com"; exit 1; }
[ "$(id -u)" -eq 0 ] || { echo "❌ Corre este script como root (sudo)."; exit 1; }
command -v apt-get >/dev/null || { echo "❌ Este script es para Ubuntu/Debian. En otro sistema sigue INSTALL.md a mano."; exit 1; }

mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
[ "$mem_mb" -ge 1900 ] || echo "⚠️  El servidor tiene ${mem_mb} MB de RAM; Twenty necesita mínimo 2 GB."

server_ip=$(curl -fsS4 https://api.ipify.org || true)
dns_ip=$(getent ahostsv4 "$domain" | awk 'NR==1 {print $1}' || true)
if [ -n "$server_ip" ] && [ "$dns_ip" != "$server_ip" ]; then
  echo "⚠️  $domain resuelve a '${dns_ip:-nada}' pero este servidor es $server_ip."
  echo "    Caddy no podrá emitir el certificado HTTPS hasta que el DNS apunte aquí."
  read -r -p "    ¿Continuar de todos modos? [s/N] " ok
  [[ "$ok" =~ ^[sS]$ ]] || exit 1
fi

echo "🐳 Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || apt-get install -y docker-compose-plugin

echo "🚀 Twenty"
./setup.sh "https://$domain"

echo "🔒 Caddy (HTTPS)"
if ! command -v caddy >/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi
port=$(grep '^TWENTY_PORT=' .env | cut -d= -f2-)
if grep -q "^$domain {" /etc/caddy/Caddyfile 2>/dev/null; then
  echo "  = $domain ya está en /etc/caddy/Caddyfile"
else
  # El Caddyfile por defecto de Debian sirve una página en :80 que choca con los sitios con dominio.
  if grep -q '^:80 {' /etc/caddy/Caddyfile 2>/dev/null && ! grep -q 'reverse_proxy' /etc/caddy/Caddyfile; then
    cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.orig
    : > /etc/caddy/Caddyfile
  fi
  printf '\n%s {\n  reverse_proxy localhost:%s\n}\n' "$domain" "${port:-3001}" >> /etc/caddy/Caddyfile
fi
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy || systemctl restart caddy

echo "💾 Respaldo diario"
cron_line="17 3 * * * $here/backup.sh /var/backups/twenty >> /var/log/twenty-backup.log 2>&1"
( crontab -l 2>/dev/null | grep -vF "$here/backup.sh"; echo "$cron_line" ) | crontab -

echo
echo "🎉 Listo: https://$domain"
echo "   1. Abre la URL y regístrate: la primera cuenta crea el workspace y queda como admin."
echo "   2. Crea una API key (Settings → MCP & APIs → API → Create API key, rol Admin) y corre:"
echo "      TWENTY_API_KEY=... python3 $here/configure-aeterna.py --url https://$domain --limpiar-demo"
echo "   3. Guarda una copia de $here/.env fuera del servidor (contiene ENCRYPTION_KEY)."
