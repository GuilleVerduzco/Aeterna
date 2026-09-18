# 🎯 LEAD SCRAPER - Sistema de Generación de Leads para México

**Generador automático de leads para servicios digitales en México usando Crawl4AI + Claude AI**

---

## 🚀 Características

✅ **Scraping Inteligente**
- Shopee.com.mx - Vendedores activos
- OLX.com.mx - Anuncios de negocios
- Google Maps - Locales sin web
- Facebook Business Pages (próximamente)

✅ **Enriquecimiento con IA**
- Claude API para validar y enriquecer datos
- Detección automática de emails
- Cálculo de score de potencial

✅ **Integración CRM**
- Pipedrive
- HubSpot
- Exportación a CSV/JSON

✅ **Automatización de Mensajes**
- Whatsapp automático (Twilio)
- Email personalizado
- Follow-up automático

---

## 📦 Instalación

### Requisitos
- Python 3.9+
- pip
- Node.js (para Playwright)

### 1. Clonar repositorio
```bash
git clone https://github.com/guilleverduzco/aeterna.git
cd aeterna
git checkout claude/scraping-skill-open-source-s17tjj
```

### 2. Crear entorno virtual
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate  # Windows
```

### 3. Instalar dependencias
```bash
pip install -r requirements-leads.txt
```

### 4. Configurar variables de entorno
```bash
cp .env.example .env
```

Editar `.env`:
```env
# Claude API
CLAUDE_API_KEY=sk-xxxxxxxxxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Twilio (Whatsapp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=+1234567890

# Gmail (para email)
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=xxxxxxxxxxxx

# CRM (Pipedrive o HubSpot)
CRM_TYPE=pipedrive  # o hubspot
PIPEDRIVE_API_KEY=xxxxxxxxxxxx

# Google Maps (opcional)
GOOGLE_MAPS_API_KEY=xxxxxxxxxxxx
```

---

## 🎮 Uso

### Ejecutar scraping básico
```bash
python mexico_lead_scraper.py
```

Salida:
```
🚀 Iniciando generación de leads para México...

📍 FASE 1: EXTRACCIÓN DE DATOS
🛍️ Scrapeando Shopee: mujer...
✅ 45 vendedores de Shopee extraídos
📱 Scrapeando OLX: negocios...
✅ 28 anuncios de OLX extraídos

📍 FASE 2: VALIDACIÓN Y LIMPIEZA
🔍 Validando duplicados...
✅ 5 duplicados removidos. Quedan 68

📍 FASE 3: ENRIQUECIMIENTO DE DATOS
🧠 Enriqueciendo 68 leads con Claude...

📍 FASE 4: EXPORTACIÓN
💾 Exportando a leads_mexico.json...
✅ 68 leads guardados en leads_mexico.json
📊 Exportando a CSV: leads_mexico.csv
✅ CSV generado: leads_mexico.csv

📊 REPORTE DE LEADS GENERADOS
============================================================
Total de leads: 68

📈 Por tipo de negocio:
  • E-commerce: 45
  • Varios: 23

🔍 Por fuente de scraping:
  • Shopee.com.mx: 45
  • OLX.com.mx: 23

⭐ Por potencial de venta:
  • Alto: 42
  • Medio: 26
============================================================
```

### Ejecutar con scraping específico
```bash
# Solo Shopee
python -c "
import asyncio
from mexico_lead_scraper import MexicoLeadScraper
scraper = MexicoLeadScraper()
asyncio.run(scraper.scrap_shopee_sellers('ropa'))
"
```

### Exportar a CRM
```bash
# Agregar a lead_scraper.py después de validar duplicados:
if config.EXPORT_TO_CRM:
    await export_to_crm(scraper.leads, config.CRM_TYPE)
```

---

## 📊 Archivos Generados

### `leads_mexico.json`
```json
{
  "metadata": {
    "fecha_generacion": "2026-09-18T10:30:00",
    "total_leads": 68,
    "fuentes": ["Shopee.com.mx", "OLX.com.mx"]
  },
  "leads": [
    {
      "nombre": "Maria Garcia",
      "email": "maria@vendedora.mx",
      "telefono": "+525512345678",
      "ubicacion": "Mexico",
      "negocio": "Tienda online: mujer",
      "tipo_negocio": "E-commerce",
      "fuente": "Shopee.com.mx",
      "potencial": "Alto",
      "contacto_url": "https://shopee.com.mx/...",
      "fecha_extraido": "2026-09-18T10:30:00"
    }
  ]
}
```

### `leads_mexico.csv`
Importable directamente a Excel/Google Sheets/CRM

```
nombre,email,telefono,ubicacion,negocio,tipo_negocio,fuente,potencial,contacto_url,fecha_extraido
Maria Garcia,maria@vendedora.mx,+525512345678,Mexico,Tienda online: mujer,E-commerce,Shopee.com.mx,Alto,...
```

---

## 🤖 Enriquecimiento con Claude

El sistema puede usar Claude API para:

1. **Validar emails**: Verifica si el email existe y es válido
2. **Encontrar contactos**: Busca info adicional del dueño/representante
3. **Calcular score**: Evalúa potencial real de venta
4. **Generar propuestas**: Crea mensajes personalizados

Ejemplo:
```python
from lead_scraper_config import Config
import anthropic

async def enriquecer_con_claude(lead: Lead, config: Config):
    client = anthropic.Anthropic(api_key=config.CLAUDE_API_KEY)
    
    prompt = f"""
    Evalúa este negocio para venta de servicios digitales:
    
    Nombre: {lead.nombre}
    Negocio: {lead.negocio}
    Tipo: {lead.tipo_negocio}
    Ubicación: {lead.ubicacion}
    Fuente: {lead.fuente}
    
    Proporciona:
    1. Score de potencial (0-100)
    2. 3 razones por las que podría comprar
    3. Propuesta personalizada de 2 líneas
    """
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return message.content[0].text
```

---

## 📱 Automatización de Mensajes

### Whatsapp automático
```python
from twilio.rest import Client

async def send_whatsapp(lead: Lead, message: str, config: Config):
    client = Client(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
    
    message = client.messages.create(
        from_=f"whatsapp:{config.TWILIO_WHATSAPP_NUMBER}",
        body=message,
        to=f"whatsapp:{lead.telefono}"
    )
    
    return message.sid
```

### Email automático
```python
import smtplib
from email.mime.text import MIMEText

async def send_email(lead: Lead, asunto: str, body: str, config: Config):
    msg = MIMEText(body, 'html')
    msg['Subject'] = asunto
    msg['From'] = config.SMTP_USER
    msg['To'] = lead.email
    
    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as server:
        server.starttls()
        server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        server.send_message(msg)
```

---

## 📅 Scheduling Automático

Para ejecutar diariamente:

### Con Celery + Redis
```python
from celery import Celery

app = Celery('aeterna')

@app.task
def scrap_leads_daily():
    scraper = MexicoLeadScraper()
    asyncio.run(scraper.ejecutar())
    return "Leads scrapeados"

# Ejecuta cada 24 horas
app.conf.beat_schedule = {
    'scrap-leads': {
        'task': 'tasks.scrap_leads_daily',
        'schedule': 86400.0,  # 24 horas
    },
}
```

### Con cron (Linux/Mac)
```bash
# Editar crontab
crontab -e

# Ejecutar diariamente a las 10 AM
0 10 * * * cd /home/user/Aeterna && python mexico_lead_scraper.py >> logs/leads.log 2>&1
```

### Con Task Scheduler (Windows)
```batch
# Crear tarea que ejecute:
python C:\Users\Usuario\Aeterna\mexico_lead_scraper.py
```

---

## 🎯 Casos de Uso

### 1. Generación de Leads E-commerce
```bash
python -c "
import asyncio
from mexico_lead_scraper import MexicoLeadScraper
from lead_scraper_config import Config

config = Config(
    SHOPEE_CATEGORIES=['ropa', 'accesorios', 'belleza'],
    SHOPEE_PAGES=5,
    SEND_WHATSAPP=True
)

scraper = MexicoLeadScraper()
asyncio.run(scraper.ejecutar())
"
```

### 2. Integración con Pipedrive
```python
import requests
from lead_scraper_config import Config

async def export_to_pipedrive(leads, config: Config):
    for lead in leads:
        data = {
            "name": lead.nombre,
            "phone": lead.telefono,
            "email": lead.email,
            "organization": lead.negocio,
            "custom_fields": {
                "source": lead.fuente,
                "type": lead.tipo_negocio,
                "score": lead.potencial
            }
        }
        
        response = requests.post(
            f"https://api.pipedrive.com/v1/persons?api_token={config.PIPEDRIVE_API_KEY}",
            json=data
        )
```

### 3. Dashboard de Analytics
Ver `lead_analytics_dashboard.py` (próximamente)

---

## ⚙️ Troubleshooting

### Error: "Crawl4AI not found"
```bash
pip install crawl4ai
```

### Error: "Playwright timeout"
Aumentar timeout en config:
```python
PLAYWRIGHT_TIMEOUT = 60000  # 60 segundos
```

### Error: "Claude API rate limited"
Implementar retry logic:
```python
import time
max_retries = 3
for retry in range(max_retries):
    try:
        # Claude call
        break
    except Exception:
        if retry < max_retries - 1:
            time.sleep(2 ** retry)
```

### Leads con email None
Implementar búsqueda de emails:
```python
async def find_email(nombre: str, negocio: str) -> Optional[str]:
    # Buscar en Hunter.io, Clearbit, etc.
    pass
```

---

## 📈 Mejoras Próximas

- [ ] Integración con Google Maps API
- [ ] Facebook Business Pages scraping
- [ ] Dashboard de analytics
- [ ] Machine learning para calificar leads
- [ ] Integración con Stripe para cobros
- [ ] API REST para acceso remoto
- [ ] Interfaz web para gestión
- [ ] Reportes automáticos por email

---

## 🔒 Consideraciones de Seguridad

✅ **Respetar robots.txt**
✅ **Rate limiting** - No sobrecargar servidores
✅ **Términos de servicio** - Verificar si está permitido el scraping
✅ **Datos personales** - GDPR/LGPD compliance
✅ **API keys** - Guardar en .env, nunca en el código

---

## 📚 Recursos

- [Crawl4AI Docs](https://crawl4ai.com)
- [Claude API](https://anthropic.com/api)
- [Playwright](https://playwright.dev)
- [Twilio Whatsapp](https://www.twilio.com/docs/whatsapp)
- [Pipedrive API](https://developers.pipedrive.com)
- [HubSpot API](https://developers.hubspot.com)

---

## 💬 Soporte

Para preguntas o bugs:
- GitHub Issues: https://github.com/guilleverduzco/aeterna/issues
- Email: soporte@aeterna.com.mx

---

**Últimas actualizaciones:** 2026-09-18
**Mantenedor:** AETERNA Team
**Licencia:** MIT
