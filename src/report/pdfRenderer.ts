import { chromium } from "playwright";
import { config } from "../config.js";

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await chromium.launch({
    headless: true,
    executablePath: config.chromiumExecutablePath,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
