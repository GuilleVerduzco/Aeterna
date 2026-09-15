import { chromium, type Browser, type BrowserContext } from "playwright";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import * as fs from "fs/promises";
import * as path from "path";

export interface VideoRecordingConfig {
  recordDir?: string;
  recordUrl: string;
  timeoutMs?: number;
}

export interface VideoRecordingResult {
  videoPath: string | null;
  recordingDurationMs: number;
  recordingSuccessful: boolean;
  error?: string;
}

export async function createBrowserWithVideoRecording(
  recordDir: string
): Promise<{ browser: Browser; context: BrowserContext }> {
  await fs.mkdir(recordDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: config.chromiumExecutablePath,
    args: ["--headless=new"],
  });

  const context = await browser.newContext({
    recordVideo: {
      dir: recordDir,
      size: { width: 1440, height: 900 },
    },
  });

  return { browser, context };
}

export async function recordPageInteraction(
  config: VideoRecordingConfig
): Promise<VideoRecordingResult> {
  const recordDir = config.recordDir || "/tmp/aeterna-videos";
  const startTime = Date.now();

  try {
    await fs.mkdir(recordDir, { recursive: true });

    const browser = await chromium.launch({
      headless: true,
      args: ["--headless=new"],
    });

    const context = await browser.newContext({
      recordVideo: {
        dir: recordDir,
        size: { width: 1440, height: 900 },
      },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(config.timeoutMs || 30000);

    try {
      await page.goto(config.recordUrl, { waitUntil: "networkidle", timeout: config.timeoutMs || 30000 });
      await page.waitForTimeout(2000);

      // Simular interacciones: scroll y hover en elementos interactivos
      const buttons = await page.locator("button, a[href], [role='button']").all();
      for (const btn of buttons.slice(0, 3)) {
        try {
          await btn.hover();
          await page.waitForTimeout(300);
        } catch {
          /* Ignore interaction errors */
        }
      }

      // Scroll down
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await page.waitForTimeout(500);

      // Scroll up
      await page.evaluate(() => {
        window.scrollBy(0, -window.innerHeight);
      });
      await page.waitForTimeout(500);
    } finally {
      const videoPath = await page.video()?.path();
      await context.close();
      await browser.close();

      const duration = Date.now() - startTime;

      if (videoPath && (await fs.stat(videoPath).catch(() => null))) {
        logger.info({ videoPath, durationMs: duration }, "Video grabado exitosamente");
        return {
          videoPath,
          recordingDurationMs: duration,
          recordingSuccessful: true,
        };
      } else {
        return {
          videoPath: null,
          recordingDurationMs: duration,
          recordingSuccessful: false,
          error: "No se generó archivo de video",
        };
      }
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, durationMs: duration }, "Fallo al grabar video");
    return {
      videoPath: null,
      recordingDurationMs: duration,
      recordingSuccessful: false,
      error: errorMsg,
    };
  }
}

export async function recordFullPageScroll(
  url: string,
  outputDir: string
): Promise<VideoRecordingResult> {
  const startTime = Date.now();

  try {
    await fs.mkdir(outputDir, { recursive: true });

    const browser = await chromium.launch({
      headless: true,
      args: ["--headless=new"],
    });

    const context = await browser.newContext({
      recordVideo: {
        dir: outputDir,
        size: { width: 1440, height: 900 },
      },
    });

    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: "networkidle" });

      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const viewportHeight = 900;
      const scrollSteps = Math.ceil(height / viewportHeight);

      for (let i = 0; i < scrollSteps; i++) {
        await page.evaluate((offset) => {
          window.scrollTo(0, offset);
        }, i * viewportHeight);
        await page.waitForTimeout(300);
      }

      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(500);
    } finally {
      const videoPath = await page.video()?.path();
      await context.close();
      await browser.close();

      const duration = Date.now() - startTime;

      if (videoPath && (await fs.stat(videoPath).catch(() => null))) {
        return {
          videoPath,
          recordingDurationMs: duration,
          recordingSuccessful: true,
        };
      } else {
        return {
          videoPath: null,
          recordingDurationMs: duration,
          recordingSuccessful: false,
          error: "Video file not created",
        };
      }
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, durationMs: duration }, "Video recording failed");
    return {
      videoPath: null,
      recordingDurationMs: duration,
      recordingSuccessful: false,
      error: errorMsg,
    };
  }
}
