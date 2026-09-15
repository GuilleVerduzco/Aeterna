import type { Page } from "playwright";

export interface WebVitalsMetrics {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  inp: number | null;
  ttfb: number | null;
  fcp: number | null;
  dcl: number | null;
  load: number | null;
}

export interface ImageAnalysisResult {
  totalImages: number;
  imagesWithoutAlt: number;
  imagesWithoutSrcSet: number;
  modernFormatImages: number;
  legacyFormatImages: number;
  lazyLoadedImages: number;
  images: Array<{
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

export async function captureWebVitals(page: Page): Promise<WebVitalsMetrics> {
  const vitals = await page.evaluate(async () => {
    const metrics: Record<string, number | null> = {
      lcp: null,
      fid: null,
      cls: null,
      inp: null,
      ttfb: null,
      fcp: null,
      dcl: null,
      load: null,
    };

    return new Promise<Record<string, number | null>>((resolve) => {
      // Largest Contentful Paint
      try {
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            metrics.lcp = Math.round(lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime);
          }
        });
        paintObserver.observe({ entryTypes: ["largest-contentful-paint"] });
      } catch {
        /* LCP not available */
      }

      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let cls = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
          metrics.cls = Math.round(cls * 1000) / 1000;
        });
        clsObserver.observe({ entryTypes: ["layout-shift"] });
      } catch {
        /* CLS not available */
      }

      // Interaction to Next Paint
      try {
        const inpObserver = new PerformanceObserver((list) => {
          let inp = 0;
          for (const entry of list.getEntries()) {
            inp = Math.max(inp, (entry as any).processingDuration);
          }
          metrics.inp = Math.round(inp);
        });
        inpObserver.observe({ entryTypes: ["event"] });
      } catch {
        /* INP not available */
      }

      // First Contentful Paint & Time to First Byte
      const perfEntries = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (perfEntries) {
        const paintEntries = performance.getEntriesByType("paint");
        const fcp = paintEntries.find((e) => e.name === "first-contentful-paint");
        if (fcp) metrics.fcp = Math.round(fcp.startTime);

        metrics.ttfb = Math.round(perfEntries.responseStart);
        metrics.dcl = Math.round(perfEntries.domContentLoadedEventEnd);
        metrics.load = Math.round(perfEntries.loadEventEnd);
      }

      setTimeout(() => resolve(metrics), 3000);
    });
  });

  return vitals as unknown as WebVitalsMetrics;
}

export async function analyzeImages(page: Page): Promise<ImageAnalysisResult> {
  return await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll("img"));
    const modernFormats = ["webp", "avif"];
    let modernCount = 0;
    let legacyCount = 0;
    let lazyCount = 0;
    let noAltCount = 0;
    let noSrcSetCount = 0;

    const imageDetails = images.map((img) => {
      const src = img.src || img.dataset.src || "";
      const format = src.split(".").pop()?.toLowerCase() || "unknown";
      const isModernFormat = modernFormats.includes(format);

      if (isModernFormat) modernCount++;
      else legacyCount++;

      if (!img.alt || img.alt.trim() === "") noAltCount++;
      if (!img.srcset) noSrcSetCount++;
      if (img.loading === "lazy") lazyCount++;

      return {
        src,
        alt: img.alt || null,
        width: img.naturalWidth || null,
        height: img.naturalHeight || null,
        loading: img.loading || null,
        format,
        isModernFormat,
        hasSrcSet: !!img.srcset,
      };
    });

    return {
      totalImages: images.length,
      imagesWithoutAlt: noAltCount,
      imagesWithoutSrcSet: noSrcSetCount,
      modernFormatImages: modernCount,
      legacyFormatImages: legacyCount,
      lazyLoadedImages: lazyCount,
      images: imageDetails.slice(0, 100),
    };
  });
}

export async function analyzeAnimationPerformance(page: Page): Promise<{
  hasAnimations: boolean;
  animationCount: number;
  reducedMotionPreference: boolean;
  animationDetails: Array<{ name: string; duration: number; iteration: string }>;
}> {
  return await page.evaluate(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const animations: Array<{ name: string; duration: number; iteration: string }> = [];

    try {
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          Array.from(sheet.cssRules).forEach((rule) => {
            if (rule.constructor.name === "CSSKeyframesRule") {
              const keyframesRule = rule as any;
              animations.push({
                name: keyframesRule.name,
                duration: 0,
                iteration: "keyframes",
              });
            }
          });
        } catch {
          /* Ignore CORS errors */
        }
      });
    } catch {
      /* Ignore errors */
    }

    return {
      hasAnimations: animations.length > 0,
      animationCount: animations.length,
      reducedMotionPreference: reducedMotion,
      animationDetails: animations.slice(0, 20),
    };
  });
}
