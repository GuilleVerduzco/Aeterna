#!/usr/bin/env python3
"""
🎯 MEXICO LEAD SCRAPER - Generador automático de leads para servicios digitales
Usa Crawl4AI + Playwright para extraer contactos de vendedores en México
"""

import json
import re
import asyncio
from typing import Optional
from datetime import datetime
from dataclasses import dataclass, asdict
from urllib.parse import quote

try:
    from crawl4ai import AsyncWebCrawler, CacheMode
except ImportError:
    print("❌ Instala crawl4ai: pip install crawl4ai")
    exit(1)


@dataclass
class Lead:
    """Estructura de un lead generado"""
    nombre: str
    email: Optional[str]
    telefono: Optional[str]
    ubicacion: str
    negocio: str
    tipo_negocio: str
    fuente: str
    potencial: str  # "Alto", "Medio", "Bajo"
    contacto_url: Optional[str]
    fecha_extraido: str


class MexicoLeadScraper:
    """Scraper inteligente de leads en México"""

    def __init__(self):
        self.crawler = None
        self.leads = []
        self.ciudades_principales = [
            "Mexico",
            "Guadalajara",
            "Monterrey",
            "Puebla",
            "Cancun",
            "Playa del Carmen",
            "Puerto Vallarta",
            "Los Cabos"
        ]

    async def init(self):
        """Inicializa el crawler"""
        self.crawler = AsyncWebCrawler(cache_mode=CacheMode.BYPASS)
        print("✅ Crawler inicializado")

    async def close(self):
        """Cierra el crawler"""
        if self.crawler:
            await self.crawler.close()

    async def scrap_shopee_sellers(self, categoria: str = "mujer") -> list[Lead]:
        """Extrae vendedores activos de Shopee.com.mx"""
        print(f"\n🛍️ Scrapeando Shopee: {categoria}...")

        leads = []
        url = f"https://shopee.com.mx/search?keyword={quote(categoria)}&page=0&sortBy=pop"

        try:
            result = await self.crawler.arun(
                url=url,
                markdown_generator="custom",
                extraction_type="sim"  # Smart extraction
            )

            # Extraer vendedores del markdown
            vendedores = re.findall(
                r'\*\*Vendedor:\s*(.+?)\*\*.*?⭐\s*([\d.]+)',
                result.markdown,
                re.MULTILINE
            )

            for vendedor, rating in vendedores[:10]:  # Top 10 por categoría
                lead = Lead(
                    nombre=vendedor.strip(),
                    email=None,
                    telefono=None,
                    ubicacion="México",
                    negocio=f"Tienda online: {categoria}",
                    tipo_negocio="E-commerce",
                    fuente="Shopee.com.mx",
                    potencial="Alto",
                    contacto_url=url,
                    fecha_extraido=datetime.now().isoformat()
                )
                leads.append(lead)

            print(f"✅ {len(leads)} vendedores de Shopee extraídos")
        except Exception as e:
            print(f"❌ Error en Shopee: {e}")

        return leads

    async def scrap_google_maps_negocios(self, tipo: str = "restaurante", ciudad: str = "Mexico") -> list[Lead]:
        """Extrae negocios locales de Google Maps sin sitio web"""
        print(f"\n📍 Scrapeando Google Maps: {tipo} en {ciudad}...")

        leads = []
        # Nota: Google Maps requiere anti-detección. Para producción usa herramientas como:
        # - Apify Google Maps Scraper
        # - ScrapingBee con JS rendering
        # Aquí es un placeholder

        # En producción, usarías:
        # url = f"https://maps.google.com/maps/search/{tipo}+en+{ciudad}"
        # Pero requiere anti-detección avanzado

        print(f"⚠️ Google Maps requiere anti-detección. Usa Apify para producción")
        return leads

    async def scrap_olx_mexico(self, categoria: str = "negocios") -> list[Lead]:
        """Extrae anuncios activos de OLX México"""
        print(f"\n📱 Scrapeando OLX: {categoria}...")

        leads = []
        url = f"https://olx.com.mx/{categoria}/"

        try:
            result = await self.crawler.arun(
                url=url,
                extraction_type="sim"
            )

            # Buscar patrones de contacto
            telefonos = re.findall(r'(?:\+?52|0)?(?:\s|-)?(?:55|33|81|686)\s?(?:\d{4}|\d{3}\s\d{3})\s?\d{4}', result.markdown)
            nombres = re.findall(r'\*\*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\*\*', result.markdown)

            for i, (nombre, telefono) in enumerate(zip(nombres[:5], telefonos[:5])):
                lead = Lead(
                    nombre=nombre.strip(),
                    email=None,
                    telefono=telefono,
                    ubicacion="México",
                    negocio="Negocio anunciado en OLX",
                    tipo_negocio="Varios",
                    fuente="OLX.com.mx",
                    potencial="Medio",
                    contacto_url=url,
                    fecha_extraido=datetime.now().isoformat()
                )
                leads.append(lead)

            print(f"✅ {len(leads)} anuncios de OLX extraídos")
        except Exception as e:
            print(f"❌ Error en OLX: {e}")

        return leads

    async def enriquecer_leads_con_claude(self, leads: list[Lead]) -> list[Lead]:
        """
        Enriquece leads con Claude API
        En producción, verificaría emails, buscaría contactos, etc.
        """
        print(f"\n🧠 Enriqueciendo {len(leads)} leads con Claude...")
        # Aquí iría integración con Claude API para:
        # - Encontrar emails
        # - Verificar datos
        # - Calcular potencial real
        # - Generar propuestas personalizadas

        for lead in leads:
            # Placeholder: Calcular score simple
            lead.potencial = "Alto" if len(lead.nombre) > 5 else "Medio"

        return leads

    async def validar_duplicados(self):
        """Elimina leads duplicados"""
        print(f"\n🔍 Validando duplicados...")
        inicial = len(self.leads)

        # Crear set de nombres únicos
        nombres_unicos = {}
        leads_limpios = []

        for lead in self.leads:
            key = f"{lead.nombre.lower()}_{lead.tipo_negocio}"
            if key not in nombres_unicos:
                nombres_unicos[key] = True
                leads_limpios.append(lead)

        self.leads = leads_limpios
        removidos = inicial - len(self.leads)
        print(f"✅ {removidos} duplicados removidos. Quedan {len(self.leads)}")

    async def exportar_json(self, filename: str = "leads_mexico.json"):
        """Exporta leads a JSON"""
        print(f"\n💾 Exportando a {filename}...")

        datos = {
            "metadata": {
                "fecha_generacion": datetime.now().isoformat(),
                "total_leads": len(self.leads),
                "fuentes": list(set(l.fuente for l in self.leads))
            },
            "leads": [asdict(lead) for lead in self.leads]
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)

        print(f"✅ {len(self.leads)} leads guardados en {filename}")

    async def exportar_csv(self, filename: str = "leads_mexico.csv"):
        """Exporta leads a CSV para Excel/CRM"""
        print(f"\n📊 Exportando a CSV: {filename}...")

        import csv
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'nombre', 'email', 'telefono', 'ubicacion', 'negocio',
                'tipo_negocio', 'fuente', 'potencial', 'contacto_url', 'fecha_extraido'
            ])
            writer.writeheader()
            for lead in self.leads:
                writer.writerow(asdict(lead))

        print(f"✅ CSV generado: {filename}")

    async def generar_reporte(self):
        """Genera reporte de leads"""
        print("\n" + "="*60)
        print("📊 REPORTE DE LEADS GENERADOS")
        print("="*60)

        print(f"Total de leads: {len(self.leads)}")

        # Por tipo de negocio
        por_tipo = {}
        for lead in self.leads:
            por_tipo[lead.tipo_negocio] = por_tipo.get(lead.tipo_negocio, 0) + 1

        print("\n📈 Por tipo de negocio:")
        for tipo, cantidad in sorted(por_tipo.items(), key=lambda x: x[1], reverse=True):
            print(f"  • {tipo}: {cantidad}")

        # Por fuente
        por_fuente = {}
        for lead in self.leads:
            por_fuente[lead.fuente] = por_fuente.get(lead.fuente, 0) + 1

        print("\n🔍 Por fuente de scraping:")
        for fuente, cantidad in sorted(por_fuente.items(), key=lambda x: x[1], reverse=True):
            print(f"  • {fuente}: {cantidad}")

        # Por potencial
        por_potencial = {}
        for lead in self.leads:
            por_potencial[lead.potencial] = por_potencial.get(lead.potencial, 0) + 1

        print("\n⭐ Por potencial de venta:")
        for potencial in ['Alto', 'Medio', 'Bajo']:
            cantidad = por_potencial.get(potencial, 0)
            if cantidad > 0:
                print(f"  • {potencial}: {cantidad}")

        print("\n" + "="*60)

    async def ejecutar(self):
        """Ejecuta el scraping completo"""
        print("\n🚀 Iniciando generación de leads para México...")

        try:
            await self.init()

            # FASE 1: EXTRACCIÓN
            print("\n📍 FASE 1: EXTRACCIÓN DE DATOS")
            print("-" * 60)

            # Shopee - Múltiples categorías
            for categoria in ["mujer", "ropa", "accesorios"]:
                leads_shopee = await self.scrap_shopee_sellers(categoria)
                self.leads.extend(leads_shopee)
                await asyncio.sleep(2)  # Rate limiting

            # OLX - Negocios
            leads_olx = await self.scrap_olx_mexico()
            self.leads.extend(leads_olx)
            await asyncio.sleep(2)

            # Google Maps (placeholder)
            # leads_maps = await self.scrap_google_maps_negocios()
            # self.leads.extend(leads_maps)

            print(f"\n✅ Total extraído antes de validar: {len(self.leads)}")

            # FASE 2: VALIDACIÓN Y LIMPIEZA
            print("\n📍 FASE 2: VALIDACIÓN Y LIMPIEZA")
            print("-" * 60)

            await self.validar_duplicados()

            # FASE 3: ENRIQUECIMIENTO
            print("\n📍 FASE 3: ENRIQUECIMIENTO DE DATOS")
            print("-" * 60)

            self.leads = await self.enriquecer_leads_con_claude(self.leads)

            # FASE 4: EXPORTACIÓN
            print("\n📍 FASE 4: EXPORTACIÓN")
            print("-" * 60)

            await self.exportar_json()
            await self.exportar_csv()

            # REPORTE
            await self.generar_reporte()

        except Exception as e:
            print(f"❌ Error crítico: {e}")
            import traceback
            traceback.print_exc()

        finally:
            await self.close()


async def main():
    """Punto de entrada"""
    scraper = MexicoLeadScraper()
    await scraper.ejecutar()


if __name__ == "__main__":
    asyncio.run(main())
