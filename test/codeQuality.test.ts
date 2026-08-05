import { describe, expect, it } from "vitest";
import { analyzeCodeQuality } from "../src/analyzers/codeQuality.js";

const MINIMAL_HTML = `<!doctype html><html lang="es"><head><title>t</title></head><body><h1>t</h1></body></html>`;

describe("analyzeCodeQuality", () => {
  it("marca todos los headers de seguridad ausentes cuando no hay ninguno", async () => {
    const result = await analyzeCodeQuality({
      html: MINIMAL_HTML,
      finalUrl: "https://sitio.invalid/",
      responseHeaders: {},
      network: [],
      consoleEntries: [],
    });

    const ids = result.findings.map((f) => f.id);
    expect(ids).toContain("code_security.missing-header-content-security-policy");
    expect(ids).toContain("code_security.missing-header-strict-transport-security");
  });

  it("no marca un header ya presente", async () => {
    const result = await analyzeCodeQuality({
      html: MINIMAL_HTML,
      finalUrl: "https://sitio.invalid/",
      responseHeaders: { "content-security-policy": "default-src 'self'" },
      network: [],
      consoleEntries: [],
    });

    const ids = result.findings.map((f) => f.id);
    expect(ids).not.toContain("code_security.missing-header-content-security-policy");
  });

  it("detecta contenido mixto (HTTP dentro de HTTPS)", async () => {
    const result = await analyzeCodeQuality({
      html: MINIMAL_HTML,
      finalUrl: "https://sitio.invalid/",
      responseHeaders: {},
      network: [
        {
          url: "http://inseguro.invalid/script.js",
          method: "GET",
          resourceType: "script",
          status: 200,
          statusText: "OK",
          headers: {},
          fromCache: false,
          transferSizeBytes: 1000,
          timingMs: 50,
        },
      ],
      consoleEntries: [],
    });

    expect(result.findings.map((f) => f.id)).toContain("code_security.mixed-content");
  });

  it("detecta versiones antiguas de jQuery", async () => {
    const html = `${MINIMAL_HTML}<script src="https://cdn.invalid/jquery-1.9.1.min.js"></script>`;
    const result = await analyzeCodeQuality({
      html,
      finalUrl: "https://sitio.invalid/",
      responseHeaders: {},
      network: [],
      consoleEntries: [],
    });

    expect(result.findings.map((f) => f.id)).toContain("code_security.outdated-lib-jquery");
  });
});
