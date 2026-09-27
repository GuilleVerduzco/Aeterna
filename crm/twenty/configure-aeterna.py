#!/usr/bin/env python3
"""Configura un workspace nuevo de Twenty para el flujo comercial de Æterna.

- Pipeline de Oportunidades en español, con etapas de agencia (Negociación, Perdido).
- Campos personalizados: servicio de interés, fuente del lead, tipo de contrato (Oportunidad);
  país LATAM, score y reporte del Site Auditor (Empresa).
- Opcional (--limpiar-demo): borra los datos de ejemplo que Twenty crea al iniciar el workspace.

Es idempotente: los campos que ya existen se dejan como están, así que se puede volver a correr.
Solo usa la librería estándar de Python.

Uso:
  TWENTY_API_KEY=... python3 configure-aeterna.py [--url http://localhost:3001] [--limpiar-demo]
La API key se crea en Twenty: Settings → MCP & APIs → API → Create API key (rol Admin).
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

COLORS = ["blue", "green", "orange", "purple", "turquoise", "pink", "yellow", "sky", "red", "gray", "gray", "gray"]


def options(*labels):
    return [
        {"label": label, "value": value, "color": COLORS[i % len(COLORS)], "position": i}
        for i, (value, label) in enumerate(labels)
    ]


# Mismos valores internos que Twenty (NEW, SCREENING…) para no romper datos ni vistas existentes;
# solo cambian las etiquetas y se agregan NEGOTIATION y LOST.
PIPELINE = [
    ("NEW", "Nuevo lead", "red"),
    ("SCREENING", "Diagnóstico", "purple"),
    ("MEETING", "Reunión", "sky"),
    ("PROPOSAL", "Propuesta enviada", "turquoise"),
    ("NEGOTIATION", "Negociación", "orange"),
    ("CUSTOMER", "Cliente", "green"),
    ("LOST", "Perdido", "gray"),
]

CUSTOM_FIELDS = {
    "opportunity": [
        {
            "name": "servicio",
            "label": "Servicio de interés",
            "type": "MULTI_SELECT",
            "icon": "IconBriefcase",
            "description": "Servicios de Æterna que le interesan al prospecto",
            "options": options(
                ("MARKETING_DIGITAL", "Marketing digital"),
                ("SITIO_WEB", "Sitio web"),
                ("TIENDA_EN_LINEA", "Tienda en línea"),
                ("REDES_SOCIALES", "Redes sociales"),
                ("CHATBOT_IA", "Chatbot / IA"),
                ("AUTOMATIZACION", "Automatización"),
                ("CONSULTORIA", "Consultoría"),
            ),
        },
        {
            "name": "fuente",
            "label": "Fuente del lead",
            "type": "SELECT",
            "icon": "IconTargetArrow",
            "description": "Canal por el que llegó el prospecto",
            "options": options(
                ("SITE_AUDITOR", "Site Auditor"),
                ("SITIO_WEB", "Sitio web"),
                ("CHATBOT", "Chatbot"),
                ("WHATSAPP", "WhatsApp"),
                ("REDES_SOCIALES", "Redes sociales"),
                ("ANUNCIOS", "Anuncios"),
                ("REFERIDO", "Referido"),
                ("EVENTO", "Evento"),
                ("OTRO", "Otro"),
            ),
        },
        {
            "name": "tipoContrato",
            "label": "Tipo de contrato",
            "type": "SELECT",
            "icon": "IconFileText",
            "description": "Proyecto único o iguala mensual",
            "options": options(
                ("PROYECTO", "Proyecto único"),
                ("IGUALA_MENSUAL", "Iguala mensual"),
            ),
        },
    ],
    "company": [
        {
            "name": "pais",
            "label": "País",
            "type": "SELECT",
            "icon": "IconWorld",
            "description": "País principal de operación",
            "options": options(
                ("MX", "México"), ("CO", "Colombia"), ("PE", "Perú"), ("CL", "Chile"),
                ("AR", "Argentina"), ("EC", "Ecuador"), ("GT", "Guatemala"), ("CR", "Costa Rica"),
                ("PA", "Panamá"), ("DO", "República Dominicana"), ("UY", "Uruguay"), ("OTRO", "Otro"),
            ),
        },
        {
            "name": "scoreSitioWeb",
            "label": "Score sitio web",
            "type": "NUMBER",
            "icon": "IconGauge",
            "description": "Puntaje global (0–100) de la última auditoría del Site Auditor",
        },
        {
            "name": "reporteAuditoria",
            "label": "Reporte de auditoría",
            "type": "LINKS",
            "icon": "IconReportAnalytics",
            "description": "Enlace al reporte HTML/PDF del Site Auditor",
        },
    ],
}


class Twenty:
    def __init__(self, url, key):
        self.url = url.rstrip("/")
        self.key = key

    def req(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(
            self.url + path,
            data=data,
            method=method,
            headers={"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(r, timeout=60) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            sys.exit(f"❌ {method} {path} → HTTP {e.code}: {e.read().decode(errors='replace')[:500]}")
        except urllib.error.URLError as e:
            sys.exit(f"❌ No se pudo conectar a {self.url}: {e.reason}")


def configure_pipeline(api, opportunity):
    stage = next(f for f in opportunity["fields"] if f["name"] == "stage")
    current = {o["value"]: o for o in stage["options"]}
    wanted = [
        {**({"id": current[v]["id"]} if v in current else {}), "value": v, "label": label, "color": color, "position": i}
        for i, (v, label, color) in enumerate(PIPELINE)
    ]
    # Conserva etapas que alguien haya agregado a mano, al final del pipeline.
    extra = [o for v, o in current.items() if v not in {p[0] for p in PIPELINE}]
    wanted += [{**o, "position": len(wanted) + i} for i, o in enumerate(extra)]
    if [(o["value"], o["label"]) for o in sorted(stage["options"], key=lambda o: o["position"])] == [
        (o["value"], o["label"]) for o in wanted
    ]:
        print("  = Pipeline ya configurado")
        return
    api.req("PATCH", f"/rest/metadata/fields/{stage['id']}", {"options": wanted})
    print("  ✓ Pipeline: " + " → ".join(label for _, label, _ in PIPELINE))


def configure_fields(api, obj, fields):
    existing = {f["name"] for f in obj["fields"]}
    for field in fields:
        if field["name"] in existing:
            print(f"  = {obj['labelSingular']}.{field['name']} ya existe")
            continue
        api.req("POST", "/rest/metadata/fields", {"objectMetadataId": obj["id"], **field})
        print(f"  ✓ {obj['labelSingular']}: campo «{field['label']}»")


def clean_demo(api):
    # Twenty siembra empresas/personas/oportunidades de ejemplo con createdBy.source = SYSTEM.
    for plural in ("opportunities", "people", "companies"):
        records = api.req("GET", f"/rest/{plural}?limit=200")["data"][plural]
        demo = [r for r in records if (r.get("createdBy") or {}).get("source") == "SYSTEM"]
        for r in demo:
            api.req("DELETE", f"/rest/{plural}/{r['id']}")
        print(f"  ✓ {plural}: {len(demo)} registros de ejemplo eliminados")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--url", default=os.environ.get("TWENTY_URL", "http://localhost:3001"))
    ap.add_argument("--limpiar-demo", action="store_true", help="borra los datos de ejemplo de Twenty")
    args = ap.parse_args()
    key = os.environ.get("TWENTY_API_KEY")
    if not key:
        sys.exit("❌ Define TWENTY_API_KEY (Settings → MCP & APIs → API → Create API key, rol Admin)")

    api = Twenty(args.url, key)
    objects = {o["nameSingular"]: o for o in api.req("GET", "/rest/metadata/objects?limit=200")["data"]}

    print("🔧 Oportunidades")
    configure_pipeline(api, objects["opportunity"])
    configure_fields(api, objects["opportunity"], CUSTOM_FIELDS["opportunity"])
    print("🔧 Empresas")
    configure_fields(api, objects["company"], CUSTOM_FIELDS["company"])
    if args.limpiar_demo:
        print("🧹 Datos de ejemplo")
        clean_demo(api)
    print("🎉 Workspace listo para Æterna")


if __name__ == "__main__":
    main()
