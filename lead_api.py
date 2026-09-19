#!/usr/bin/env python3
"""
🚀 API ÆTERNA - Backend para Dashboard de Leads
Endpoint FastAPI que sirve datos en tiempo real del sistema de scraping
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
import csv
from io import StringIO

# ============================================================================
# MODELOS DE DATOS
# ============================================================================


class Lead(BaseModel):
    """Modelo de un lead"""
    id: str
    nombre: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    ubicacion: str
    negocio: str
    tipo_negocio: str
    fuente: str
    potencial: str  # Alto, Medio, Bajo
    contacto_url: Optional[str] = None
    fecha_extraido: str


class DashboardStats(BaseModel):
    """Estadísticas principales del dashboard"""
    total_leads: int
    leads_alto_potencial: int
    tasa_conversion: float
    ingresos_proyectados: float
    leads_este_mes: int
    clientes_proximos: int
    tasa_crecimiento: float


class AnalyticsData(BaseModel):
    """Datos analíticos agregados"""
    leads_por_fuente: List[dict]
    leads_por_tipo: List[dict]
    leads_por_potencial: List[dict]
    tendencia_7_dias: List[dict]
    ciudades_top: List[dict]
    canales_efectivos: List[dict]


class ScraperStatus(BaseModel):
    """Estado del scraper"""
    estado: str  # running, idle, completed, error
    progreso: float  # 0-100
    ultimo_run: Optional[str] = None
    proxima_ejecucion: Optional[str] = None
    leads_extraidos: int
    errores: List[str] = []


# ============================================================================
# INICIALIZACIÓN
# ============================================================================

app = FastAPI(
    title="Æterna Lead API",
    description="API para gestión de leads y analytics",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas
LEADS_FILE = Path(__file__).parent / "leads_mexico.json"
CACHE_DIR = Path(__file__).parent / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================


def cargar_leads() -> List[Lead]:
    """Carga leads del archivo JSON"""
    if not LEADS_FILE.exists():
        return []

    with open(LEADS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return [Lead(**lead) for lead in data.get('leads', [])]


def calcular_stats(leads: List[Lead]) -> DashboardStats:
    """Calcula estadísticas principales"""
    total = len(leads)
    alto = len([l for l in leads if l.potencial == 'Alto'])

    # Estimaciones
    tasa_conversion = 0.067  # 6.7%
    clientes = int(total * tasa_conversion * 0.1)
    ingresos = clientes * 2500 * 12  # $2500/mes promedio * 12 meses

    # Leads este mes
    ahora = datetime.now()
    hace_30_dias = ahora - timedelta(days=30)
    leads_mes = len([
        l for l in leads
        if datetime.fromisoformat(l.fecha_extraido.replace('Z', '+00:00')) > hace_30_dias
    ])

    return DashboardStats(
        total_leads=total,
        leads_alto_potencial=alto,
        tasa_conversion=tasa_conversion,
        ingresos_proyectados=ingresos,
        leads_este_mes=leads_mes,
        clientes_proximos=clientes,
        tasa_crecimiento=0.12  # 12% mes a mes
    )


def calcular_analytics(leads: List[Lead]) -> AnalyticsData:
    """Calcula datos analíticos"""

    # Por fuente
    por_fuente = {}
    for lead in leads:
        fuente = lead.fuente.split('.')[0]
        por_fuente[fuente] = por_fuente.get(fuente, 0) + 1

    leads_por_fuente = [
        {'fuente': k, 'cantidad': v}
        for k, v in sorted(por_fuente.items(), key=lambda x: x[1], reverse=True)
    ]

    # Por tipo de negocio
    por_tipo = {}
    for lead in leads:
        por_tipo[lead.tipo_negocio] = por_tipo.get(lead.tipo_negocio, 0) + 1

    leads_por_tipo = [
        {'tipo': k, 'cantidad': v}
        for k, v in sorted(por_tipo.items(), key=lambda x: x[1], reverse=True)
    ]

    # Por potencial
    por_potencial = {}
    for lead in leads:
        por_potencial[lead.potencial] = por_potencial.get(lead.potencial, 0) + 1

    leads_por_potencial = [
        {'potencial': k, 'cantidad': v, 'fill': '#C9A96E' if k == 'Alto' else '#6B7280' if k == 'Medio' else '#E5E7EB'}
        for k, v in por_potencial.items()
    ]

    # Tendencia últimos 7 días
    ahora = datetime.now()
    tendencia = {}

    for i in range(7, 0, -1):
        fecha = (ahora - timedelta(days=i)).date()
        tendencia[fecha.strftime('%a')] = 0

    for lead in leads:
        fecha_lead = datetime.fromisoformat(lead.fecha_extraido.replace('Z', '+00:00')).date()
        if (ahora.date() - fecha_lead).days <= 7:
            día = fecha_lead.strftime('%a')
            if día in tendencia:
                tendencia[día] += 1

    tendencia_7_dias = [
        {'dia': k, 'cantidad': v}
        for k, v in tendencia.items()
    ]

    # Top ciudades
    por_ciudad = {}
    for lead in leads:
        por_ciudad[lead.ubicacion] = por_ciudad.get(lead.ubicacion, 0) + 1

    ciudades_top = [
        {'ciudad': k, 'cantidad': v}
        for k, v in sorted(por_ciudad.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # Canales efectivos (por conversión)
    canales_efectivos = [
        {'canal': k, 'efectividad': v / total if (total := sum(por_fuente.values())) > 0 else 0}
        for k, v in por_fuente.items()
    ]

    return AnalyticsData(
        leads_por_fuente=leads_por_fuente,
        leads_por_tipo=leads_por_tipo,
        leads_por_potencial=leads_por_potencial,
        tendencia_7_dias=tendencia_7_dias,
        ciudades_top=ciudades_top,
        canales_efectivos=canales_efectivos
    )


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/", tags=["Info"])
async def root():
    """Información de la API"""
    return {
        "nombre": "Æterna Lead API",
        "version": "1.0.0",
        "descripcion": "API para gestión de leads y analytics",
        "endpoints": {
            "stats": "/api/stats",
            "analytics": "/api/analytics",
            "leads": "/api/leads",
            "scraper": "/api/scraper",
            "exportar": "/api/exportar"
        }
    }


@app.get("/api/stats", response_model=DashboardStats, tags=["Dashboard"])
async def obtener_stats():
    """Obtiene estadísticas principales"""
    try:
        leads = cargar_leads()
        return calcular_stats(leads)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics", response_model=AnalyticsData, tags=["Dashboard"])
async def obtener_analytics():
    """Obtiene datos analíticos"""
    try:
        leads = cargar_leads()
        return calcular_analytics(leads)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/leads", tags=["Leads"])
async def listar_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    potencial: Optional[str] = None,
    tipo_negocio: Optional[str] = None,
    fuente: Optional[str] = None,
    ubicacion: Optional[str] = None,
):
    """Lista leads con filtros opcionales"""
    try:
        leads = cargar_leads()

        # Filtrar
        if potencial:
            leads = [l for l in leads if l.potencial == potencial]
        if tipo_negocio:
            leads = [l for l in leads if l.tipo_negocio == tipo_negocio]
        if fuente:
            leads = [l for l in leads if fuente in l.fuente]
        if ubicacion:
            leads = [l for l in leads if l.ubicacion == ubicacion]

        # Paginar
        total = len(leads)
        leads = leads[skip:skip + limit]

        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "leads": leads
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/lead/{lead_id}", response_model=Lead, tags=["Leads"])
async def obtener_lead(lead_id: str):
    """Obtiene un lead específico"""
    try:
        leads = cargar_leads()
        for lead in leads:
            if lead.id == lead_id:
                return lead
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scraper/status", response_model=ScraperStatus, tags=["Scraper"])
async def scraper_status():
    """Obtiene estado del scraper"""
    return ScraperStatus(
        estado="idle",
        progreso=100,
        ultimo_run="2026-09-19T10:30:00Z",
        proxima_ejecucion="2026-09-20T10:00:00Z",
        leads_extraidos=847,
        errores=[]
    )


@app.post("/api/scraper/ejecutar", tags=["Scraper"])
async def ejecutar_scraper():
    """Ejecuta el scraper manualmente"""
    try:
        # En producción, aquí se ejecutaría el scraper real
        # Para demo, solo retornamos estado
        return {
            "mensaje": "Scraper iniciado",
            "estado": "running",
            "job_id": "job_123"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/exportar/csv", tags=["Exportar"])
async def exportar_csv():
    """Exporta leads a CSV"""
    try:
        leads = cargar_leads()

        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            'id', 'nombre', 'email', 'telefono', 'ubicacion', 'negocio',
            'tipo_negocio', 'fuente', 'potencial', 'fecha_extraido'
        ])
        writer.writeheader()

        for lead in leads:
            writer.writerow({
                'id': lead.id,
                'nombre': lead.nombre,
                'email': lead.email or '',
                'telefono': lead.telefono or '',
                'ubicacion': lead.ubicacion,
                'negocio': lead.negocio,
                'tipo_negocio': lead.tipo_negocio,
                'fuente': lead.fuente,
                'potencial': lead.potencial,
                'fecha_extraido': lead.fecha_extraido
            })

        return {
            "csv": output.getvalue(),
            "total": len(leads),
            "generado": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/exportar/json", tags=["Exportar"])
async def exportar_json():
    """Exporta leads a JSON"""
    try:
        leads = cargar_leads()
        return {
            "total": len(leads),
            "generado": datetime.now().isoformat(),
            "leads": leads
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/proyecciones/30dias", tags=["Proyecciones"])
async def proyecciones_30_dias():
    """Genera proyecciones para los próximos 30 días"""
    try:
        leads = cargar_leads()
        stats = calcular_stats(leads)

        proyecciones = []
        for día in range(1, 31):
            leads_día = int(stats.leads_este_mes / 30)
            conversiones = int(leads_día * stats.tasa_conversion)
            ingresos = conversiones * 2500  # $2500 por cliente

            proyecciones.append({
                "dia": día,
                "leads": leads_día,
                "conversiones": conversiones,
                "ingresos": ingresos
            })

        return {
            "periodo": "30 días",
            "total_proyectado": sum(p["leads"] for p in proyecciones),
            "conversiones_proyectadas": sum(p["conversiones"] for p in proyecciones),
            "ingresos_proyectados": sum(p["ingresos"] for p in proyecciones),
            "proyecciones": proyecciones
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health", tags=["Info"])
async def health_check():
    """Health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "leads_file_exists": LEADS_FILE.exists(),
        "leads_count": len(cargar_leads())
    }


# ============================================================================
# DESARROLLO LOCAL
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    print("""
    🚀 Æterna Lead API
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    Servidor: http://localhost:8000
    Documentación: http://localhost:8000/docs
    ReDoc: http://localhost:8000/redoc

    Presiona Ctrl+C para detener
    """)

    uvicorn.run(
        "lead_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
