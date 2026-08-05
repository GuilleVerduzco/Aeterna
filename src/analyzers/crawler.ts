import { chromium, type Browser, type ConsoleMessage } from "playwright";
import { config } from "../config.js";
import type { ViewportScreenshot } from "../types/index.js";

export interface ConsoleEntry {
  type: string;
  text: string;
  location?: string;
}

export interface NetworkEntry {
  url: string;
  method: string;
  resourceType: string;
  status: number | null;
  statusText: string | null;
  headers: Record<string, string>;
  fromCache: boolean;
  transferSizeBytes: number | null;
  timingMs: number | null;
}

export interface CrawlResult {
  requestedUrl: string;
  finalUrl: string;
  html: string;
  title: string;
  statusCode: number | null;
  responseHeaders: Record<string, string>;
  console: ConsoleEntry[];
  network: NetworkEntry[];
  screenshots: ViewportScreenshot[];
  timingMs: {
    domContentLoaded: number | null;
    load: number | null;
  };
  computedStyles: {
    fontsUsed: string[];
    colorsUsed: string[];
    textSamples: { selector: string; color: string; backgroundColor: string; fontSize: string; fontWeight: string; text: string }[];
  };
  viewportOverflow: { hasHorizontalOverflow: boolean; scrollWidth: number; clientWidth: number }[];
  axeResults: unknown;
}

const MOBILE_VIEWPORT = { name: "mobile" as const, width: 390, height: 844 };
const TABLET_VIEWPORT = { name: "tablet" as const, width: 834, height: 1194 };
const DESKTOP_VIEWPORT = { name: "desktop" as const, width: 1440, height: 900 };
const VIEWPORTS = [MOBILE_VIEWPORT, TABLET_VIEWPORT, DESKTOP_VIEWPORT];

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    sharedBrowser = await chromium.launch({
      headless: true,
      executablePath: config.chromiumExecutablePath,
    });
  }
  return sharedBrowser;
}

export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

export async function crawl(
  url: string,
  opts: { captureScreenshots: boolean; timeoutMs: number; axeSource: string }
): Promise<CrawlResult> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: DESKTOP_VIEWPORT.width, height: DESKTOP_VIEWPORT.height },
    userAgent:
      "Mozilla/5.0 (compatible; AeternaSiteAuditor/1.0; +https://www.c4b.mx) Chrome/128.0.0.0 Safari/537.36",
  });

  const consoleEntries: ConsoleEntry[] = [];
  const networkEntries: NetworkEntry[] = [];
  const requestStartTimes = new Map<string, number>();

  const page = await context.newPage();

  page.on("console", (msg: ConsoleMessage) => {
    consoleEntries.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()?.url,
    });
  });

  page.on("requestfinished", async (req) => {
    const start = requestStartTimes.get(req.url());
    try {
      const res = await req.response();
      const headers = res ? await res.allHeaders() : {};
      const sizes = await req.sizes().catch(() => null);
      networkEntries.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        status: res?.status() ?? null,
        statusText: res?.statusText() ?? null,
        headers,
        fromCache: res?.status() === 304,
        transferSizeBytes: sizes ? sizes.responseBodySize + sizes.responseHeadersSize : null,
        timingMs: start ? Date.now() - start : null,
      });
    } catch {
      // Respuesta ya no disponible (navegación posterior); se ignora.
    }
  });

  page.on("request", (req) => requestStartTimes.set(req.url(), Date.now()));

  page.setDefaultTimeout(opts.timeoutMs);

  let statusCode: number | null = null;
  let responseHeaders: Record<string, string> = {};

  const mainResponse = await page.goto(url, {
    waitUntil: "networkidle",
    timeout: opts.timeoutMs,
  });
  if (mainResponse) {
    statusCode = mainResponse.status();
    responseHeaders = await mainResponse.allHeaders();
  }

  const finalUrl = page.url();
  const html = await page.content();
  const title = await page.title();

  const timingMs = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return { domContentLoaded: null, load: null };
    return {
      domContentLoaded: nav.domContentLoadedEventEnd,
      load: nav.loadEventEnd,
    };
  });

  const computedStyles = await page.evaluate(() => {
    const fonts = new Set<string>();
    const colors = new Set<string>();
    const samples: { selector: string; color: string; backgroundColor: string; fontSize: string; fontWeight: string; text: string }[] = [];

    const candidates = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, p, a, button, span, li, label")
    ).slice(0, 400);

    for (const el of candidates) {
      const style = window.getComputedStyle(el as Element);
      fonts.add(style.fontFamily);
      colors.add(style.color);
      colors.add(style.backgroundColor);
      const text = (el.textContent || "").trim().slice(0, 60);
      if (text.length > 0 && samples.length < 200) {
        samples.push({
          selector: (el as Element).tagName.toLowerCase(),
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          text,
        });
      }
    }
    return { fontsUsed: Array.from(fonts), colorsUsed: Array.from(colors), textSamples: samples };
  });

  const screenshots: ViewportScreenshot[] = [];
  const viewportOverflow: CrawlResult["viewportOverflow"] = [];

  if (opts.captureScreenshots) {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(150);
      const buf = await page.screenshot({ fullPage: true, type: "png" }).catch(() => null);
      if (buf) {
        screenshots.push({
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          base64Png: buf.toString("base64"),
        });
      }
      const overflow = await page.evaluate(() => ({
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      viewportOverflow.push(overflow);
    }
  }

  let axeResults: unknown = null;
  try {
    await page.addScriptTag({ content: opts.axeSource });
    axeResults = await page.evaluate(async () => {
      // @ts-expect-error axe se inyecta globalmente vía addScriptTag
      return await window.axe.run(document, {
        resultTypes: ["violations", "incomplete"],
      });
    });
  } catch (err) {
    axeResults = { error: err instanceof Error ? err.message : String(err) };
  }

  await context.close();

  return {
    requestedUrl: url,
    finalUrl,
    html,
    title,
    statusCode,
    responseHeaders,
    console: consoleEntries,
    network: networkEntries,
    screenshots,
    timingMs,
    computedStyles,
    viewportOverflow,
    axeResults,
  };
}
