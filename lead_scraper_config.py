"""
⚙️ CONFIGURACIÓN DEL SISTEMA DE GENERACIÓN DE LEADS
"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class Config:
    """Configuración principal"""

    # 🔧 CRAWL4AI
    CRAWL4AI_ENABLED: bool = True
    PLAYWRIGHT_TIMEOUT: int = 30000  # ms
    CONCURRENT_REQUESTS: int = 3

    # 🤖 CLAUDE API
    CLAUDE_API_KEY: str = os.getenv("CLAUDE_API_KEY", "")
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"
    ENRICH_LEADS: bool = True

    # 📊 CRM INTEGRATIONS
    CRM_TYPE: str = os.getenv("CRM_TYPE", "none")  # pipedrive, hubspot, none
    PIPEDRIVE_API_KEY: str = os.getenv("PIPEDRIVE_API_KEY", "")
    HUBSPOT_API_KEY: str = os.getenv("HUBSPOT_API_KEY", "")
    HUBSPOT_COMPANY_PIPELINE_ID: str = "0"  # Default

    # 📱 WHATSAPP (Twilio)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_NUMBER: str = os.getenv("TWILIO_WHATSAPP_NUMBER", "")
    SEND_WHATSAPP: bool = False

    # 📧 EMAIL
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SEND_EMAIL: bool = False

    # 💾 DATABASE
    DB_TYPE: str = "json"  # json, postgresql, mongodb
    DB_PATH: str = "leads_database.json"
    POSTGRESQL_URL: str = os.getenv("DATABASE_URL", "")

    # 📍 SCRAPING TARGETS
    SHOPEE_ENABLED: bool = True
    SHOPEE_CATEGORIES: list[str] = ["mujer", "ropa", "accesorios", "belleza"]
    SHOPEE_PAGES: int = 2

    OLX_ENABLED: bool = True
    OLX_CATEGORIES: list[str] = ["negocios"]

    GOOGLE_MAPS_ENABLED: bool = False  # Requiere API key
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

    FACEBOOK_ENABLED: bool = False  # Para business pages

    # 🎯 SEGMENTACIÓN
    TARGET_CITIES: list[str] = [
        "Mexico",
        "Guadalajara",
        "Monterrey",
        "Puebla",
        "Cancun",
        "Playa del Carmen",
        "Puerto Vallarta",
        "Los Cabos"
    ]

    TARGET_BUSINESS_TYPES: list[str] = [
        "E-commerce",
        "Restaurante",
        "Servicio Local",
        "Consultoría",
        "Agencia",
        "Tienda Online"
    ]

    # 📈 FILTROS DE POTENCIAL
    MIN_LEAD_SCORE: float = 0.5  # 0-1
    MIN_RESPONSE_RATE: float = 0.05  # 5%

    # 🔄 SCHEDULING
    SCHEDULE_SCRAPING: bool = False
    SCRAPING_INTERVAL_HOURS: int = 24  # Daily
    FOLLOWUP_INTERVAL_DAYS: int = 3  # Follow-up on day 3

    # 📝 OUTPUT
    OUTPUT_JSON: str = "leads_mexico.json"
    OUTPUT_CSV: str = "leads_mexico.csv"
    EXPORT_TO_CRM: bool = False


# Plantillas de mensajes de outreach
MESSAGE_TEMPLATES = {
    "whatsapp_ecommerce": """
Hola {nombre}! 👋

Vi tu tienda en {fuente} y se ve increíble 🛍️

Soy de AETERNA (agencia de IA). Ayudamos a vendedores como tú a:
✅ Crear tienda web propia (sin comisiones)
✅ Automatizar con chatbots IA
✅ Aumentar ventas 30-50%

¿Hablamos de tu negocio? Consulta gratis 🎯

{url_propuesta}
    """,

    "whatsapp_restaurante": """
Hola {nombre}! 👋

¿Tu restaurante aparece en Google pero sin web propia?

En AETERNA hacemos sitios que:
✅ Muestran menú + horarios
✅ Reservas automáticas
✅ Aparecer primero en Google

Quiero ayudarte a crecer 🍽️

¿Llamamos 5 min? {url_propuesta}
    """,

    "email_ecommerce": """
Asunto: Tu tienda online sin comisiones + IA 🚀

Hola {nombre},

Vimos que vendes en {fuente}. ¡Buen trabajo!

Sabemos que las comisiones duelen. Por eso ayudamos a vendedores a:

📱 Sitio web propio (control total)
🤖 Chatbot IA para atender clientes H24
📊 Integración con redes (vende desde todos lados)
📈 Aumentar ventas 30-50% promedio

Todo desde $2,000/mes.

¿Te gustaría una propuesta personalizada?

{url_propuesta}

¡Saludos!
Equipo AETERNA
    """,

    "email_servicio": """
Asunto: Más clientes para tu negocio (sin publicidad) 💼

Hola {nombre},

Trabajamos con negocios de servicios en México para:
✅ Aparecer primero en Google (SEO)
✅ Generar clientes automáticamente
✅ Gestionar con CRM + IA

Tu mercado: {ubicacion}
Tu potencial: Muy alto

¿Charlamos?

{url_propuesta}

AETERNA Team
    """
}

# Configuraciones por tipo de negocio
BUSINESS_TYPE_CONFIG = {
    "E-commerce": {
        "potencial_base": 0.9,
        "precio_estimado": 2500,
        "mensaje_template": "whatsapp_ecommerce",
        "prioridad": 1
    },
    "Restaurante": {
        "potencial_base": 0.8,
        "precio_estimado": 1500,
        "mensaje_template": "whatsapp_restaurante",
        "prioridad": 1
    },
    "Servicio Local": {
        "potencial_base": 0.7,
        "precio_estimado": 1200,
        "mensaje_template": "email_servicio",
        "prioridad": 2
    },
    "Tienda Online": {
        "potencial_base": 0.85,
        "precio_estimado": 3000,
        "mensaje_template": "whatsapp_ecommerce",
        "prioridad": 1
    },
    "Consultoría": {
        "potencial_base": 0.6,
        "precio_estimado": 1500,
        "mensaje_template": "email_servicio",
        "prioridad": 3
    }
}

# URLs de propuestas
PROPOSAL_URLS = {
    "ecommerce": "https://aeterna.com.mx/propuesta/ecommerce",
    "servicio": "https://aeterna.com.mx/propuesta/servicio",
    "chatbot": "https://aeterna.com.mx/propuesta/chatbot",
    "default": "https://aeterna.com.mx/propuesta"
}


def load_config() -> Config:
    """Carga configuración desde env vars o defaults"""
    return Config()


def validate_config(config: Config) -> bool:
    """Valida la configuración"""
    checks = []

    if config.SEND_WHATSAPP and not config.TWILIO_ACCOUNT_SID:
        print("⚠️ Whatsapp habilitado pero falta TWILIO_ACCOUNT_SID")
        checks.append(False)

    if config.SEND_EMAIL and not config.SMTP_USER:
        print("⚠️ Email habilitado pero falta SMTP_USER")
        checks.append(False)

    if config.EXPORT_TO_CRM and config.CRM_TYPE == "none":
        print("⚠️ CRM exportación habilitada pero CRM_TYPE es 'none'")
        checks.append(False)

    if config.ENRICH_LEADS and not config.CLAUDE_API_KEY:
        print("⚠️ Enriquecimiento con Claude habilitado pero falta API key")
        checks.append(False)

    return all(checks) if checks else True
