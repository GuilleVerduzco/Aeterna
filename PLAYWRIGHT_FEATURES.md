# 🎬 Nuevas funcionalidades de Playwright - Aeterna Site Auditor

## Resumen

Se han implementado **3 prioridades** de Playwright para potenciar el auditor de sitios web de Aeterna:

1. ✅ **Emulación de temas** (dark/light mode)
2. ✅ **Web Vitals en tiempo real**
3. ✅ **Grabación de videos**

---

## 1️⃣ Emulación de Temas (Dark/Light Mode)

### Archivo: `src/analyzers/themeEmulation.ts`

**Funcionalidades:**
- 📸 Captura automática de screenshots en modo claro y oscuro
- 🎨 Análisis de soporte CSS `prefers-color-scheme`
- 🔍 Detección de variables CSS para temas
- ✓ Validación de contraste en ambos modos

**Uso:**
```typescript
import { captureThemeVariants, detectThemePreferences } from './analyzers/themeEmulation';

// Capturar variantes de tema
const themeData = await captureThemeVariants(page);
console.log(themeData.lightModeScreenshots);
console.log(themeData.darkModeScreenshots);

// Detectar preferencias de tema del sitio
const prefs = await detectThemePreferences(page);
console.log(prefs.usesMediaQueryDarkMode); // ¿Tiene media query?
console.log(prefs.darkModeColorVariables); // Variables CSS detectadas
```

**Datos capturados:**
- Screenshots en 3 viewports para cada tema
- Ratios de contraste en ambos modos
- Soporte de `color-scheme` CSS
- Variables CSS relacionadas con temas

**Ideal para:**
- Auditar experiencia en modo oscuro
- Validar diseño responsivo en diferentes temas
- Reportes visuales comparativos para clientes

---

## 2️⃣ Web Vitals en Tiempo Real

### Archivo: `src/analyzers/webVitalsAnalyzer.ts`

**Métricas capturadas:**
```typescript
interface WebVitalsMetrics {
  lcp: number | null;      // Largest Contentful Paint
  fid: number | null;      // First Input Delay
  cls: number | null;      // Cumulative Layout Shift
  inp: number | null;      // Interaction to Next Paint
  ttfb: number | null;     // Time to First Byte
  fcp: number | null;      // First Contentful Paint
}
```

**Análisis de imágenes:**
```typescript
interface ImageAnalysisResult {
  totalImages: number;
  imagesWithoutAlt: number;
  imagesWithoutSrcSet: number;
  modernFormatImages: number;      // WebP/AVIF
  legacyFormatImages: number;      // JPG/PNG/GIF
  lazyLoadedImages: number;
  images: Array<{                  // Detalle de cada imagen
    src: string;
    alt: string | null;
    width: number | null;
    height: number | null;
    loading: string | null;
    format: string;
    isModernFormat: boolean;
    hasSrcSet: boolean;
  }>;
}
```

**Uso:**
```typescript
import { captureWebVitals, analyzeImages, analyzeAnimationPerformance } from './analyzers/webVitalsAnalyzer';

// Capturar Web Vitals
const vitals = await captureWebVitals(page);
console.log(`LCP: ${vitals.lcp}ms`);  // ¿Menos de 2500ms?
console.log(`CLS: ${vitals.cls}`);   // ¿Menos de 0.1?

// Analizar imágenes
const images = await analyzeImages(page);
console.log(`${images.imagesWithoutAlt} imágenes sin alt`);
console.log(`${images.legacyFormatImages} imágenes en formato antiguo`);

// Analizar animaciones
const animations = await analyzeAnimationPerformance(page);
console.log(`Animaciones detectadas: ${animations.animationCount}`);
console.log(`¿Respeta reduced-motion?: ${!animations.reducedMotionPreference}`);
```

**Hallazgos automáticos:**
- ⚠️ LCP lento (> 2500ms)
- ⚠️ CLS alto (> 0.1)
- ⚠️ Imágenes sin atributo `alt`
- ⚠️ Formatos de imagen no modernos
- ⚠️ TTFB lento (> 600ms)
- ⚠️ Animaciones que ignoran `prefers-reduced-motion`

**Ideal para:**
- Auditoria SEO (Google prioriza Core Web Vitals)
- Reportes de performance para clientes
- Identificar problemas de accesibilidad visual

---

## 3️⃣ Grabación de Videos

### Archivo: `src/analyzers/videoRecorder.ts`

**Funcionalidades:**
- 🎥 Grabación completa de interacción con la página
- 🖱️ Simulación automática de acciones (hover, scroll)
- 📹 Video en 1440x900 con audio opcional
- 💾 Exportación a archivo `.webm`

**Uso:**
```typescript
import { recordPageInteraction, recordFullPageScroll } from './analyzers/videoRecorder';

// Opción 1: Grabar interacción completa (hover, scroll)
const result = await recordPageInteraction({
  recordUrl: 'https://example.com',
  recordDir: './videos',
  timeoutMs: 30000
});

if (result.recordingSuccessful) {
  console.log(`Video guardado en: ${result.videoPath}`);
  console.log(`Duración: ${result.recordingDurationMs}ms`);
}

// Opción 2: Grabar scroll completo de página
const scrollResult = await recordFullPageScroll(
  'https://example.com',
  './videos'
);
```

**Configuración:**
```typescript
interface VideoRecordingConfig {
  recordUrl: string;           // URL a grabar
  recordDir?: string;         // Directorio de salida
  timeoutMs?: number;         // Timeout por defecto 30000ms
}
```

**Lo que se graba:**
1. ✅ Carga inicial de página
2. ✅ Hover en botones/enlaces
3. ✅ Scroll automático (arriba y abajo)
4. ✅ Transiciones visuales

**Ideal para:**
- Presentaciones a clientes en Zoom/Meet
- Documentación de bugs visuales
- Demostraciones de flujos de usuario
- Reportes de diseño/UX

---

## 🔧 Integración en la API

### Ejemplo completo de análisis con todas las prioridades:

```typescript
const analysis = await runAnalysis({
  url: 'https://example.com',
  categories: ['design', 'performance', 'accessibility'],
  screenshots: true,
  captureThemeVariants: true,      // ✅ Nuevo
  captureWebVitals: true,          // ✅ Nuevo
  captureVideoRecording: true,     // ✅ Nuevo
  maxLinksChecked: 50
});

// Acceder a datos adicionales
console.log(analysis.themeVariants?.lightModeScreenshots);
console.log(analysis.webVitals?.lcp);
console.log(analysis.videoRecording?.videoPath);
```

---

## 📊 Módulo de análisis integrado: `advancedVisuals.ts`

Proporciona análisis automatizado de todos los datos capturados:

```typescript
import { captureAdvancedVisuals, analyzeAdvancedVisuals } from './analyzers/advancedVisuals';

// Capturar datos
const data = await captureAdvancedVisuals({
  page,
  captureThemeVariants: true,
  captureWebVitals: true,
  analyzeImages: true
});

// Analizar y generar hallazgos
const result = analyzeAdvancedVisuals(data);
console.log(`Score de diseño: ${result.score}`);
console.log(`Hallazgos: ${result.findings.length}`);
```

---

## 🎯 Hallazgos automáticos detectados

### Temas
- ❌ Sin soporte para modo oscuro
- ⚠️ Inconsistencia en contraste entre temas

### Web Vitals
- ❌ LCP lento
- ❌ CLS elevado
- ❌ TTFB lento
- ⚠️ FCP lento

### Imágenes
- ❌ Imágenes sin texto alternativo
- ⚠️ Imágenes en formatos obsoletos
- ⚠️ Imágenes sin srcset
- ⚠️ Imágenes no lazy-loaded

### Accesibilidad
- ❌ Animaciones que ignoran `prefers-reduced-motion`

---

## 📦 Dependencias

✅ **Ya instaladas en Playwright 1.48.2:**
- `chromium` - Motor del navegador
- Soporte para video recording
- Emulación de media queries
- Captura de performance metrics

---

## 🚀 Próximos pasos sugeridos

1. **Integrar en reportes PDF/HTML** - Incluir screenshots de temas en reportes
2. **Dashboard visual** - Mostrar comparación dark/light en UI
3. **Métricas históricas** - Guardar Web Vitals en BD para trending
4. **Video en reportes** - Embedear video en reportes interactivos
5. **Análisis de accesibilidad visual** - Combinar con axe-core para visibilidad

---

## 📝 Notas importantes

- La grabación de video requiere suficiente espacio en disco
- Los videos se graban en formato `.webm` (compatible con navegadores modernos)
- Web Vitals se capturan después de `networkidle`
- La emulación de temas se hace sin recargar la página (eficiente)
- Todos los módulos están diseñados para no bloquear el flujo de análisis

---

**¡Aeterna ahora tiene capacidades visuales avanzadas para auditoría profesional!** 🎉
