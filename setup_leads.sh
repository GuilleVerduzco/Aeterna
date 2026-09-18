#!/bin/bash

# 🎯 SETUP SCRIPT - Lead Generation System para AETERNA México

echo "════════════════════════════════════════════════════════════"
echo "🎯 SETUP: Sistema de Generación de Leads para México"
echo "════════════════════════════════════════════════════════════"
echo ""

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no encontrado. Instálalo primero."
    exit 1
fi

echo "✅ Python $(python3 --version) detectado"
echo ""

# 1. Crear entorno virtual
echo "📦 Creando entorno virtual..."
python3 -m venv venv

if [ $? -eq 0 ]; then
    echo "✅ Entorno virtual creado"
else
    echo "❌ Error al crear entorno virtual"
    exit 1
fi

# 2. Activar entorno
echo "🔌 Activando entorno..."
source venv/bin/activate

if [ $? -eq 0 ]; then
    echo "✅ Entorno activado"
else
    echo "❌ Error al activar entorno"
    exit 1
fi

# 3. Instalar dependencias
echo ""
echo "📚 Instalando dependencias..."
pip install --upgrade pip setuptools wheel
pip install -r requirements-leads.txt

if [ $? -eq 0 ]; then
    echo "✅ Dependencias instaladas"
else
    echo "❌ Error al instalar dependencias"
    exit 1
fi

# 4. Copiar .env
echo ""
echo "⚙️ Configurando variables de entorno..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Archivo .env creado (COMPLETA TUS API KEYS)"
else
    echo "✅ Archivo .env ya existe"
fi

# 5. Crear directorios
echo ""
echo "📁 Creando directorios..."
mkdir -p logs
mkdir -p data/leads
mkdir -p data/cache
echo "✅ Directorios creados"

# 6. Mostrar instrucciones
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ SETUP COMPLETADO"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📝 PRÓXIMOS PASOS:"
echo ""
echo "1. Edita .env con tus credenciales:"
echo "   nano .env"
echo ""
echo "2. Ejecuta el scraper:"
echo "   python mexico_lead_scraper.py"
echo ""
echo "3. Los leads se guardarán en:"
echo "   📄 leads_mexico.json"
echo "   📊 leads_mexico.csv"
echo ""
echo "4. Lee la documentación:"
echo "   cat LEAD_SCRAPER_README.md"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
