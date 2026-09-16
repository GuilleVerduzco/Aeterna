import { chromium } from "playwright";
import { captureWebVitals, analyzeImages } from "./src/analyzers/webVitalsAnalyzer.js";
import { detectThemePreferences } from "./src/analyzers/themeEmulation.js";

async function testPlaywrightFeatures() {
  console.log("\n🎬 === PRUEBA COMPLETA DE PLAYWRIGHT === 🎬\n");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--headless=new"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: "Mozilla/5.0 (compatible; AeternaSiteAuditor/1.0)",
    });

    const page = await context.newPage();

    // TEST 1: Navegación básica (usando HTML local)
    console.log("📌 TEST 1: Navegación y contenido");
    console.log("   Cargando página HTML local...");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prueba de Aeterna con Playwright</title>
        <style>
          body { font-family: Arial; background: #fff; color: #000; }
          @media (prefers-color-scheme: dark) {
            body { background: #1a1a1a; color: #fff; }
          }
          h1 { color: #0066cc; }
          img { max-width: 100%; }
        </style>
      </head>
      <body>
        <h1>Aeterna Site Auditor</h1>
        <p>Prueba de Playwright con todas las funcionalidades</p>
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23007bff'/%3E%3C/svg%3E" alt="Logo de prueba">
        <a href="#test">Link de prueba</a>
        <button>Botón de prueba</button>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);
    const title = await page.title();
    console.log(`   ✅ Título: "${title}"`);
    console.log(`   ✅ Página cargada correctamente\n`);

    // TEST 2: Captura de screenshot
    console.log("📌 TEST 2: Captura de screenshots");
    const screenshot = await page.screenshot({ fullPage: true, type: "png" });
    console.log(`   ✅ Screenshot capturado (${Math.round(screenshot.length / 1024)}KB)\n`);

    // TEST 3: Web Vitals
    console.log("📌 TEST 3: Captura de Web Vitals");
    const vitals = await captureWebVitals(page);
    console.log(`   ✅ TTFB: ${vitals.ttfb}ms`);
    console.log(`   ✅ FCP: ${vitals.fcp}ms`);
    console.log(`   ✅ LCP: ${vitals.lcp}ms`);
    console.log(`   ✅ CLS: ${vitals.cls}`);
    console.log(`   ✅ INP: ${vitals.inp}ms\n`);

    // TEST 4: Análisis de imágenes
    console.log("📌 TEST 4: Análisis de imágenes");
    const imageAnalysis = await analyzeImages(page);
    console.log(`   ✅ Total de imágenes: ${imageAnalysis.totalImages}`);
    console.log(`   ✅ Imágenes sin alt: ${imageAnalysis.imagesWithoutAlt}`);
    console.log(`   ✅ Formato moderno (WebP/AVIF): ${imageAnalysis.modernFormatImages}`);
    console.log(`   ✅ Formato legado (JPG/PNG/GIF): ${imageAnalysis.legacyFormatImages}\n`);

    // TEST 5: Emulación de temas
    console.log("📌 TEST 5: Emulación de temas (prefers-color-scheme)");

    // Modo claro
    await page.emulateMedia({ colorScheme: "light" });
    const lightScreenshot = await page.screenshot({ fullPage: true, type: "png" });
    console.log(`   ✅ Screenshot en modo LIGHT: ${Math.round(lightScreenshot.length / 1024)}KB`);

    // Modo oscuro
    await page.emulateMedia({ colorScheme: "dark" });
    const darkScreenshot = await page.screenshot({ fullPage: true, type: "png" });
    console.log(`   ✅ Screenshot en modo DARK: ${Math.round(darkScreenshot.length / 1024)}KB`);

    // Detectar preferencias de tema
    const themePrefs = await detectThemePreferences(page);
    console.log(`   ✅ Usa media-query dark mode: ${themePrefs.usesMediaQueryDarkMode}`);
    console.log(`   ✅ Usa CSS color-scheme: ${themePrefs.usesColorSchemeCSS}`);
    console.log(`   ✅ Variables CSS detectadas: ${Object.keys(themePrefs.darkModeColorVariables).length}\n`);

    // TEST 6: Interacciones
    console.log("📌 TEST 6: Interacciones (hover, scroll)");
    const links = await page.locator("a").all();
    console.log(`   ✅ Enlaces encontrados: ${links.length}`);

    if (links.length > 0) {
      await links[0].hover();
      console.log(`   ✅ Hover en primer enlace`);
    }

    // Scroll
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    console.log(`   ✅ Scroll ejecutado\n`);

    // TEST 7: Información de red
    console.log("📌 TEST 7: Información de navegación");
    const perfMetrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      if (!nav) return null;
      return {
        responseStart: Math.round(nav.responseStart),
        domContentLoadedEnd: Math.round(nav.domContentLoadedEventEnd),
        loadEventEnd: Math.round(nav.loadEventEnd),
      };
    });
    if (perfMetrics) {
      console.log(`   ✅ Response Start: ${perfMetrics.responseStart}ms`);
      console.log(`   ✅ DOM Content Loaded: ${perfMetrics.domContentLoadedEnd}ms`);
      console.log(`   ✅ Load Event: ${perfMetrics.loadEventEnd}ms\n`);
    }

    // TEST 8: Console logs
    console.log("📌 TEST 8: Captura de logs de consola");
    let consoleCount = 0;
    page.on("console", (msg) => {
      consoleCount++;
    });
    await page.waitForTimeout(500);
    console.log(`   ✅ Logs de consola capturados: ${consoleCount}\n`);

    // TEST 9: Propiedades CSS
    console.log("📌 TEST 9: Análisis de estilos CSS");
    const styles = await page.evaluate(() => {
      const body = document.body;
      const style = window.getComputedStyle(body);
      return {
        backgroundColor: style.backgroundColor,
        fontFamily: style.fontFamily,
        color: style.color,
      };
    });
    console.log(`   ✅ Background: ${styles.backgroundColor}`);
    console.log(`   ✅ Font: ${styles.fontFamily}`);
    console.log(`   ✅ Color: ${styles.color}\n`);

    console.log("✨ ===== TODAS LAS PRUEBAS PASARON EXITOSAMENTE ===== ✨\n");

    console.log("📊 RESUMEN:");
    console.log("   ✅ Navegación y carga");
    console.log("   ✅ Captura de screenshots");
    console.log("   ✅ Web Vitals en tiempo real");
    console.log("   ✅ Análisis de imágenes");
    console.log("   ✅ Emulación de temas (dark/light)");
    console.log("   ✅ Interacciones (hover, scroll)");
    console.log("   ✅ Performance metrics");
    console.log("   ✅ Console logging");
    console.log("   ✅ CSS analysis\n");

    await context.close();
  } finally {
    await browser.close();
  }
}

testPlaywrightFeatures().catch(console.error);
