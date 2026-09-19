#!/usr/bin/env python3
"""
🎯 MEXICO LEAD SCRAPER - Demo Mode
Generador de leads realistas para demostración
(Versión sin dependencias externas - para ambiente de desarrollo)
"""

import json
import csv
import random
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import List, Optional

@dataclass
class Lead:
    """Estructura de un lead"""
    id: str
    nombre: str
    email: Optional[str]
    telefono: Optional[str]
    ubicacion: str
    negocio: str
    tipo_negocio: str
    fuente: str
    potencial: str
    contacto_url: Optional[str]
    fecha_extraido: str


class DemoLeadScraper:
    """Generador de leads realistas"""

    def __init__(self):
        self.leads = []
        self.nombres_vendedores = [
            "María García", "Carlos López", "Ana Martínez", "Juan Pérez",
            "Rosa Flores", "Miguel Rodríguez", "Laura Sánchez", "Diego Torres",
            "Sofía González", "Roberto Díaz", "Elena Castro", "Fernando Ruiz",
            "Patricia Moreno", "Manuel Jiménez", "Claudia Vargas", "Andrés Cruz"
        ]

        self.negocios = [
            "Tienda online: ropa y accesorios",
            "Tienda online: electrónica",
            "Tienda online: belleza y cosméticos",
            "Tienda online: deportes",
            "Tienda online: hogar",
            "Restaurante y comida",
            "Café y pastelería",
            "Bar y cantina",
            "Pizzería",
            "Comida rápida",
            "Servicio de plomería",
            "Servicio eléctrico",
            "Servicio de reparaciones",
            "Asesoría contable",
            "Consultoría empresarial",
            "Agencia de marketing",
            "Estudio fotográfico",
            "Peluquería y barbería"
        ]

        self.ciudades = [
            "Mexico",
            "Guadalajara",
            "Monterrey",
            "Puebla",
            "Cancun",
            "Playa del Carmen",
            "Puerto Vallarta",
            "Los Cabos",
            "Merida",
            "Queretaro"
        ]

        self.tipos_negocio = {
            "E-commerce": ["ropa", "electrónica", "belleza", "deportes", "hogar"],
            "Restaurante": ["restaurante", "café", "bar", "pizzería", "comida rápida"],
            "Servicio Local": ["plomería", "eléctrico", "reparaciones"],
            "Consultoría": ["contable", "empresarial", "marketing"],
            "Otros": ["fotografía", "peluquería"]
        }

    def generar_datos_realistas(self) -> List[Lead]:
        """Genera leads realistas basados en datos de México"""
        print("\n🚀 Iniciando generación de leads para México...")
        print("="*60)

        leads = []
        lead_id = 1

        # SHOPEE: 40-60 vendedores
        print("\n🛍️ Generando vendedores de Shopee.com.mx...")
        for i in range(random.randint(40, 60)):
            nombre = random.choice(self.nombres_vendedores)
            negocio = random.choice(self.negocios)
            ciudad = random.choice(self.ciudades)

            lead = Lead(
                id=str(lead_id),
                nombre=f"{nombre} {random.choice(['García', 'López', 'Martínez', 'Pérez', 'Sánchez'])}",
                email=f"vendor{lead_id}@shopee.mx",
                telefono=f"+525{random.randint(10000000, 99999999)}",
                ubicacion=ciudad,
                negocio=negocio,
                tipo_negocio=self.obtener_tipo(negocio),
                fuente="Shopee.com.mx",
                potencial=self.calcular_potencial(negocio),
                contacto_url=f"https://shopee.com.mx/search?keyword={negocio.split(':')[0]}",
                fecha_extraido=(datetime.now() - timedelta(days=random.randint(0, 7))).isoformat()
            )
            leads.append(lead)
            lead_id += 1

        print(f"✅ {len([l for l in leads if l.fuente == 'Shopee.com.mx'])} vendedores de Shopee generados")

        # OLX: 20-40 anuncios
        print("\n📱 Generando anuncios de OLX.com.mx...")
        olx_start = lead_id
        for i in range(random.randint(20, 40)):
            nombre = random.choice(self.nombres_vendedores)
            negocio = random.choice(self.negocios)
            ciudad = random.choice(self.ciudades)

            lead = Lead(
                id=str(lead_id),
                nombre=f"{nombre}",
                email=None,
                telefono=f"+525{random.randint(10000000, 99999999)}",
                ubicacion=ciudad,
                negocio=negocio,
                tipo_negocio=self.obtener_tipo(negocio),
                fuente="OLX.com.mx",
                potencial=self.calcular_potencial(negocio),
                contacto_url="https://olx.com.mx/",
                fecha_extraido=(datetime.now() - timedelta(days=random.randint(0, 7))).isoformat()
            )
            leads.append(lead)
            lead_id += 1

        olx_count = lead_id - olx_start
        print(f"✅ {olx_count} anuncios de OLX generados")

        # Google Maps: 15-30 negocios locales
        print("\n📍 Generando negocios de Google Maps...")
        maps_start = lead_id
        for i in range(random.randint(15, 30)):
            nombre = random.choice(self.nombres_vendedores)
            negocio = random.choice(self.negocios)
            ciudad = random.choice(self.ciudades)

            lead = Lead(
                id=str(lead_id),
                nombre=f"{nombre}",
                email=None,
                telefono=f"+525{random.randint(10000000, 99999999)}",
                ubicacion=ciudad,
                negocio=negocio,
                tipo_negocio=self.obtener_tipo(negocio),
                fuente="Google Maps",
                potencial=self.calcular_potencial(negocio),
                contacto_url=f"https://maps.google.com/search/{negocio}",
                fecha_extraido=(datetime.now() - timedelta(days=random.randint(0, 7))).isoformat()
            )
            leads.append(lead)
            lead_id += 1

        maps_count = lead_id - maps_start
        print(f"✅ {maps_count} negocios de Google Maps generados")

        return leads

    def obtener_tipo(self, negocio: str) -> str:
        """Detecta el tipo de negocio"""
        negocio_lower = negocio.lower()

        if "tienda" in negocio_lower or "online" in negocio_lower:
            return "E-commerce"
        elif "restaurante" in negocio_lower or "café" in negocio_lower or "bar" in negocio_lower or "pizzería" in negocio_lower or "comida" in negocio_lower:
            return "Restaurante"
        elif "plomería" in negocio_lower or "eléctrico" in negocio_lower or "reparación" in negocio_lower:
            return "Servicio Local"
        elif "contable" in negocio_lower or "consultoría" in negocio_lower or "marketing" in negocio_lower:
            return "Consultoría"
        else:
            return "Otros"

    def calcular_potencial(self, negocio: str) -> str:
        """Calcula potencial basado en tipo de negocio"""
        tipo = self.obtener_tipo(negocio)

        if tipo in ["E-commerce", "Restaurante"]:
            return random.choice(["Alto", "Alto", "Alto", "Medio"])
        elif tipo == "Servicio Local":
            return random.choice(["Alto", "Medio", "Medio"])
        elif tipo == "Consultoría":
            return random.choice(["Medio", "Medio", "Bajo"])
        else:
            return random.choice(["Alto", "Medio", "Bajo"])

    def validar_duplicados(self):
        """Elimina leads duplicados"""
        print(f"\n🔍 Validando duplicados...")
        inicial = len(self.leads)

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

    def exportar_json(self, filename: str = "leads_mexico.json"):
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

    def exportar_csv(self, filename: str = "leads_mexico.csv"):
        """Exporta leads a CSV"""
        print(f"\n📊 Exportando a CSV: {filename}...")

        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'id', 'nombre', 'email', 'telefono', 'ubicacion', 'negocio',
                'tipo_negocio', 'fuente', 'potencial', 'contacto_url', 'fecha_extraido'
            ])
            writer.writeheader()
            for lead in self.leads:
                writer.writerow(asdict(lead))

        print(f"✅ CSV generado: {filename}")

    def generar_reporte(self):
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
                porcentaje = (cantidad / len(self.leads)) * 100
                print(f"  • {potencial}: {cantidad} ({porcentaje:.1f}%)")

        # Ciudades principales
        por_ciudad = {}
        for lead in self.leads:
            por_ciudad[lead.ubicacion] = por_ciudad.get(lead.ubicacion, 0) + 1

        print("\n🌍 Principales ciudades:")
        for ciudad, cantidad in sorted(por_ciudad.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"  • {ciudad}: {cantidad}")

        print("\n" + "="*60)

    def ejecutar(self):
        """Ejecuta el scraper completo"""
        try:
            # FASE 1: GENERACIÓN
            print("\n📍 FASE 1: GENERACIÓN DE DATOS")
            print("-" * 60)

            self.leads = self.generar_datos_realistas()

            # FASE 2: VALIDACIÓN
            print("\n📍 FASE 2: VALIDACIÓN Y LIMPIEZA")
            print("-" * 60)

            self.validar_duplicados()

            # FASE 3: EXPORTACIÓN
            print("\n📍 FASE 3: EXPORTACIÓN")
            print("-" * 60)

            self.exportar_json()
            self.exportar_csv()

            # REPORTE
            self.generar_reporte()

        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()


def main():
    """Punto de entrada"""
    scraper = DemoLeadScraper()
    scraper.ejecutar()


if __name__ == "__main__":
    main()
