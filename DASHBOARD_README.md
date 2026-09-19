# 📊 DASHBOARD ÆTERNA - Lead Generation Analytics

**Sistema de visualización en tiempo real de leads y analytics para servicios digitales en México**

---

## 🎨 Diseño & Marca

Completamente alineado con la **Identidad Æterna**:

- **Tipografía**: Instrument Serif (títulos) + Manrope (UI) + JetBrains Mono (datos)
- **Colores**: 80% tinta/crema, 15% piedra, 5% oro
- **Componentes**: Gráficos limpios, sin decoraciones innecesarias
- **CTA**: Botones dorados rectangulares (radio 4px)

---

## 🚀 Instalación Rápida

### 1. **Setup Completo** (Backend + Frontend)

```bash
# Clonar y posicionarse
cd aeterna
git checkout claude/scraping-skill-open-source-s17tjj

# Terminal 1: Backend (Python API)
source venv/bin/activate  # o venv\Scripts\activate en Windows
pip install -r requirements-leads.txt
python lead_api.py

# Terminal 2: Frontend (Next.js)
npm install
npm run dev
```

**Resultado:**
- 🔧 Backend API: http://localhost:8000
- 📊 Dashboard: http://localhost:3000
- 📚 API Docs: http://localhost:8000/docs

### 2. **Setup Solo Scraper** (Sin dashboard)

```bash
./setup_leads.sh
python mexico_lead_scraper.py
```

---

## 📋 Características del Dashboard

### 1. **Métricas en Tiempo Real**

```
┌─────────────────────────────────────────────────┐
│ Total Leads    │ Potencial Alto │ Conversión  │
│   847          │      567       │    6.7%     │
└─────────────────────────────────────────────────┘
```

- Total de leads acumulados
- Leads con potencial alto
- Tasa de conversión estimada
- Ingresos proyectados (MRR×12)

### 2. **Gráficos Analíticos**

#### 📊 Leads por Fuente
Comparativo de efectividad de cada canal:
- Shopee.com.mx
- OLX.com.mx
- Google Maps
- Facebook Business

#### 🥧 Leads por Tipo de Negocio
Distribución de oportunidades:
- E-commerce (45%)
- Restaurantes (28%)
- Servicios (17%)
- Otros (10%)

#### 📈 Tendencia 7 Días
Línea de crecimiento de leads extraídos

#### 🎯 Potencial de Venta
- Alto (67%)
- Medio (28%)
- Bajo (5%)

### 3. **Tabla de Leads Recientes**

Display scrolleable de últimos 10 leads con:
- Nombre y negocio
- Tipo de negocio
- Ubicación
- Fuente de scraping
- Score de potencial
- Fecha de extracción

### 4. **Controles**

**Filtros disponibles:**
- Rango de fechas (últimos 30, 7 días, hoy)
- Tipo de negocio
- Ubicación/Ciudad
- Fuente de scraping
- Potencial (Alto/Medio/Bajo)

**Acciones:**
- ↓ Exportar CSV (para CRM)
- ▶ Ejecutar Scraper (manual)
- 🔄 Refresh en tiempo real

---

## 🔗 Endpoints de la API

### Estadísticas
```bash
GET http://localhost:8000/api/stats
# Retorna: total_leads, alto_potencial, conversión, ingresos, etc.
```

### Analytics
```bash
GET http://localhost:8000/api/analytics
# Retorna: leads por fuente, tipo, potencial, tendencia 7d, etc.
```

### Listar Leads (con filtros)
```bash
GET http://localhost:8000/api/leads?skip=0&limit=50
GET http://localhost:8000/api/leads?potencial=Alto
GET http://localhost:8000/api/leads?tipo_negocio=E-commerce
GET http://localhost:8000/api/leads?ubicacion=Mexico
```

### Lead Específico
```bash
GET http://localhost:8000/api/lead/{lead_id}
```

### Scraper
```bash
GET http://localhost:8000/api/scraper/status
POST http://localhost:8000/api/scraper/ejecutar
```

### Proyecciones
```bash
GET http://localhost:8000/api/proyecciones/30dias
# Retorna: leads proyectados, conversiones, ingresos
```

### Exportar
```bash
GET http://localhost:8000/api/exportar/csv
GET http://localhost:8000/api/exportar/json
```

### Health Check
```bash
GET http://localhost:8000/api/health
```

---

## 📱 Estructura de Componentes React

### `LeadDashboard` (Principal)
Container principal que renderiza:

```
LeadDashboard
├── HeaderSection
│   └── Logo + Tagline
├── StatsSection
│   ├── StatCard (Total Leads)
│   ├── StatCard (Potencial Alto)
│   ├── StatCard (Conversión)
│   └── StatCard (Ingresos)
├── AnalyticsSection
│   ├── Gráfico: Leads por Fuente (Bar)
│   ├── Gráfico: Por Tipo (Pie)
│   ├── Gráfico: Tendencia 7d (Line)
│   └── Filtros y Controles
├── LeadsTable
│   └── Tabla de leads recientes
└── FooterSection
    └── Contacto + Links
```

### Componentes Reutilizables

#### `StatCard`
```tsx
<StatCard
  label="Total Leads"
  valor={847}
  subtexto="Acumulados"
  destaque={false}
  icono="📊"
/>
```

#### `Button`
```tsx
<Button variant="primary" onClick={handleClick}>
  ▶ Ejecutar Scraper
</Button>
```

---

## 🎨 Sistema de Tokens de Diseño

### Colores
```css
--color-tinta: #0D1117;      /* 80% - Fondo oscuro */
--color-crema: #F7F5F0;      /* 80% - Fondo claro */
--color-piedra: #6B7280;     /* 15% - Neutral */
--color-oro: #C9A96E;        /* 5% - Accents/CTAs */
```

### Tipografía
```css
--font-serif: 'Instrument Serif', serif;    /* Títulos */
--font-sans: 'Manrope', sans-serif;         /* UI/Cuerpo */
--font-mono: 'JetBrains Mono', monospace;   /* Datos */
```

### Espaciado
```css
--space-xs: 0.5rem;
--space-sm: 1rem;
--space-md: 1.5rem;
--space-lg: 2rem;
--space-xl: 3rem;
```

---

## 🔄 Ciclo de Datos

```
┌─────────────────────────────────────────────────────┐
│ LEADS SCRAPEADOS (leads_mexico.json)                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
        ┌──────────────────────────┐
        │   PYTHON BACKEND         │
        │   (lead_api.py)          │
        │                          │
        │  - Calcula stats         │
        │  - Agrega analytics      │
        │  - Filtra y exporta      │
        └──────────────┬───────────┘
                       │
            API JSON endpoints
                       │
        ┌──────────────┴───────────┐
        │                          │
        ↓                          ↓
    FRONTEND            USUARIOS FINALES
   (Next.js)           (CRM, Email, etc)
    (React)
    
  - Gráficos
  - Filtros
  - Estadísticas
  - Exportación
```

---

## 🚀 Workflow Completo

### Flujo 1: Scraping + Dashboard

```bash
# Terminal 1: Scraper (cada 24 horas)
python mexico_lead_scraper.py
# → Genera leads_mexico.json y leads_mexico.csv

# Terminal 2: Backend (siempre corriendo)
python lead_api.py
# → http://localhost:8000
# → Lee leads_mexico.json
# → Calcula stats y analytics en tiempo real

# Terminal 3: Frontend (siempre corriendo)
npm run dev
# → http://localhost:3000
# → Consume API del backend
# → Renderiza dashboard interactivo
```

### Flujo 2: Scraper + Email Automático

```bash
python mexico_lead_scraper.py
→ Genera leads_mexico.json
→ Enriquece con Claude API
→ Exporta CSV a leads_mexico.csv
→ (Próxima fase) Envía Whatsapp automático
```

### Flujo 3: Integración CRM

```bash
GET /api/exportar/csv
→ Archivo CSV listo
→ Importar en Pipedrive/HubSpot
→ Crear deals automáticamente
```

---

## 🔧 Personalización

### Cambiar Colores (Marca)

Edita `lead_dashboard.tsx`:

```tsx
const TOKENS = {
  colors: {
    tinta: '#TU_COLOR',       // Tu color principal
    crema: '#TU_COLOR_CLARO', // Fondo
    piedra: '#TU_GRIS',       // Neutral
    oro: '#TU_ACCENT',        // CTAs
  }
}
```

### Agregar Nuevas Métricas

En `lead_api.py`, agrega función en `calcular_stats()`:

```python
def calcular_stats(leads: List[Lead]) -> DashboardStats:
    # ... código existente ...
    
    # Nueva métrica
    avg_respuesta = calcular_promedio(leads)
    
    return DashboardStats(
        # ... existente ...
        nueva_metrica=avg_respuesta
    )
```

### Personalizar Gráficos

Usa `Recharts` para agregar más gráficos:

```tsx
<ResponsiveContainer width="100%" height={300}>
  <ScatterChart data={data}>
    <XAxis dataKey="x" />
    <YAxis dataKey="y" />
    <Scatter name="Leads" data={data} fill={TOKENS.colors.oro} />
  </ScatterChart>
</ResponsiveContainer>
```

---

## 📈 Métricas Principales

| Métrica | Objetivo | Fórmula |
|---------|----------|---------|
| **Total Leads** | > 1000/mes | Leads extraídos |
| **Conversión** | 5-10% | Clientes/Leads |
| **Ingresos MRR** | $10-20K | Clientes × $2,500 |
| **Potencial Alto %** | > 60% | Alto / Total × 100 |
| **Tasa Crecimiento** | 10-15%/mes | (Hoy - 30d) / 30d |

---

## 🐛 Troubleshooting

### Error: "Connection refused" en API

```bash
# Verifica que el backend esté corriendo
curl http://localhost:8000/api/health

# Si no responde, inicia:
python lead_api.py
```

### Error: "No leads found"

```bash
# Ejecuta el scraper primero
python mexico_lead_scraper.py

# Verifica que leads_mexico.json existe
ls -la leads_mexico.json
```

### Error: "Gráficos no se renderizan"

```bash
# Instala Recharts
npm install recharts

# Reinicia Next.js
npm run dev
```

### Port 3000 o 8000 en uso

```bash
# Cambiar puerto (en terminal antes de ejecutar):

# Para Next.js
npm run dev -- -p 3001

# Para FastAPI
python -m uvicorn lead_api:app --port 8001
```

---

## 🔐 Seguridad en Producción

### 1. **Variables de Entorno**
```bash
# .env (NUNCA versionar)
CLAUDE_API_KEY=sk-xxx
DATABASE_URL=postgresql://...
```

### 2. **CORS Restringido**
```python
# En lead_api.py
allow_origins=["https://tu-dominio.com"]
```

### 3. **Autenticación**
Agregar JWT tokens:

```python
from fastapi.security import HTTPBearer

security = HTTPBearer()

@app.get("/api/stats")
async def obtener_stats(credentials = Depends(security)):
    # Verificar token
    ...
```

### 4. **Rate Limiting**
```bash
pip install slowapi

from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.get("/api/leads")
@limiter.limit("100/minute")
async def listar_leads():
    ...
```

---

## 📊 Analytics Avanzados

### Predicciones con ML (Próximo)

```python
from sklearn.linear_model import LinearRegression

def predecir_conversiones(leads):
    # Entrenar modelo
    X = [[l.score] for l in leads]
    y = [1 if converted else 0 for l in leads]
    
    model = LinearRegression()
    model.fit(X, y)
    
    return model.predict(leads)
```

### A/B Testing de Mensajes

```tsx
{variant === 'A' && (
  <MessageVariant>
    "Aumenta tus ventas 30%"
  </MessageVariant>
)}
{variant === 'B' && (
  <MessageVariant>
    "Gratis: Tienda web + IA"
  </MessageVariant>
)}
```

---

## 🔗 Integración con Terceros

### Conectar a Pipedrive
```python
# En lead_api.py
@app.post("/api/sync/pipedrive")
async def sync_to_pipedrive():
    for lead in leads:
        crear_deal_pipedrive(lead)
```

### Conectar a HubSpot
```python
@app.post("/api/sync/hubspot")
async def sync_to_hubspot():
    for lead in leads:
        crear_contacto_hubspot(lead)
```

### Webhook para eventos
```python
@app.post("/api/webhook/lead-created")
async def on_lead_created(lead: Lead):
    # Enviar a Slack
    # Crear en CRM
    # Guardar en DB
    pass
```

---

## 📚 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Recharts Docs](https://recharts.org/)
- [Æterna Brand Guide](./references/brand-guide.md)

---

## 📞 Soporte

**Guillermo Verduzco**
- WhatsApp: [81 1475 0015](https://wa.me/528114750015)
- Email: info@c4b.mx
- Website: www.c4b.mx

---

**Última actualización:** 2026-09-19
**Licencia:** MIT
**Æterna © 2026**
