import { chromium, type Page } from "playwright";
import type { ViewportScreenshot } from "../types/index.js";

export interface ThemeEmulationResult {
  lightModeScreenshots: ViewportScreenshot[];
  darkModeScreenshots: ViewportScreenshot[];
  themeColorContrast: {
    lightMode: number[];
    darkMode: number[];
  };
  colorSchemeSupport: {
    supportsLight: boolean;
    supportsDark: boolean;
  };
}

const VIEWPORTS = [
  { name: "mobile" as const, width: 390, height: 844 },
  { name: "tablet" as const, width: 834, height: 1194 },
  { name: "desktop" as const, width: 1440, height: 900 },
];

export async function captureThemeVariants(page: Page): Promise<ThemeEmulationResult> {
  const lightModeScreenshots: ViewportScreenshot[] = [];
  const darkModeScreenshots: ViewportScreenshot[] = [];
  const contrastRatios = { lightMode: [] as number[], darkMode: [] as number[] };

  // Capturar modo claro
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForTimeout(200);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(100);

    const buf = await page.screenshot({ fullPage: true, type: "png" }).catch(() => null);
    if (buf) {
      lightModeScreenshots.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        base64Png: buf.toString("base64"),
      });
    }

    const lightContrast = await page.evaluate(() => {
      const ratios: number[] = [];
      const elements = Array.from(document.querySelectorAll("p, a, span, h1, h2, h3")).slice(0, 50);
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bg = style.backgroundColor;
        if (color && bg && bg !== "rgba(0, 0, 0, 0)") {
          ratios.push(parseFloat(color) || 1);
        }
      }
      return ratios;
    });
    contrastRatios.lightMode.push(...lightContrast);
  }

  // Capturar modo oscuro
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(200);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(100);

    const buf = await page.screenshot({ fullPage: true, type: "png" }).catch(() => null);
    if (buf) {
      darkModeScreenshots.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        base64Png: buf.toString("base64"),
      });
    }

    const darkContrast = await page.evaluate(() => {
      const ratios: number[] = [];
      const elements = Array.from(document.querySelectorAll("p, a, span, h1, h2, h3")).slice(0, 50);
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bg = style.backgroundColor;
        if (color && bg && bg !== "rgba(0, 0, 0, 0)") {
          ratios.push(parseFloat(color) || 1);
        }
      }
      return ratios;
    });
    contrastRatios.darkMode.push(...darkContrast);
  }

  // Detectar soporte de color-scheme
  const schemeSupport = await page.evaluate(() => {
    const html = document.documentElement;
    const htmlStyle = window.getComputedStyle(html);
    return {
      supportsLight: htmlStyle.colorScheme?.includes("light") ?? false,
      supportsDark: htmlStyle.colorScheme?.includes("dark") ?? false,
    };
  });

  return {
    lightModeScreenshots,
    darkModeScreenshots,
    themeColorContrast: contrastRatios,
    colorSchemeSupport: schemeSupport,
  };
}

export async function detectThemePreferences(page: Page): Promise<{
  usesMediaQueryDarkMode: boolean;
  usesColorSchemeCSS: boolean;
  darkModeColorVariables: Record<string, string>;
}> {
  return await page.evaluate(() => {
    const root = document.documentElement;
    const styles = window.getComputedStyle(root);

    const usesMediaQueryDarkMode = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules);
        } catch {
          return [];
        }
      })
      .some((rule) => (rule as any).media?.mediaText?.includes("prefers-color-scheme: dark"));

    const colorSchemeValue = styles.colorScheme || "";
    const usesColorSchemeCSS = colorSchemeValue.includes("dark");

    const variables: Record<string, string> = {};
    const allProps = styles.length;
    for (let i = 0; i < allProps; i++) {
      const prop = styles[i];
      if (prop?.startsWith("--") && (prop.includes("dark") || prop.includes("color"))) {
        variables[prop] = styles.getPropertyValue(prop).trim();
      }
    }

    return {
      usesMediaQueryDarkMode,
      usesColorSchemeCSS,
      darkModeColorVariables: variables,
    };
  });
}
