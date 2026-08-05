import { describe, expect, it } from "vitest";
import { analyzeSeo } from "../src/analyzers/seo.js";

const BASE_URL = "https://example-test-domain-for-aeterna.invalid/";

function findingIds(result: Awaited<ReturnType<typeof analyzeSeo>>): string[] {
  return result.findings.map((f) => f.id);
}

describe("analyzeSeo", () => {
  it("detecta problemas comunes en una página mínima y mal formada", async () => {
    const html = `<!doctype html><html><head></head><body><h3>sin h1</h3></body></html>`;
    const result = await analyzeSeo({ html, finalUrl: BASE_URL, maxLinksChecked: 0 });

    expect(findingIds(result)).toEqual(
      expect.arrayContaining([
        "seo.title-missing",
        "seo.meta-description-missing",
        "seo.canonical-missing",
        "seo.viewport-missing",
        "seo.h1-missing",
        "seo.og-tags-missing",
        "seo.structured-data-missing",
      ])
    );
    expect(result.score).toBeLessThan(100);
  });

  it("no marca imágenes con alt vacío (decorativas) como sin alt", async () => {
    const html = `<!doctype html><html><head><title>Título de prueba suficientemente largo</title>
      <meta name="description" content="Una descripción de longitud razonable para pruebas automatizadas."/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <link rel="canonical" href="${BASE_URL}"/></head>
      <body><h1>Título</h1><img src="a.png" alt=""/></body></html>`;
    const result = await analyzeSeo({ html, finalUrl: BASE_URL, maxLinksChecked: 0 });

    expect(findingIds(result)).not.toContain("seo.img-alt-missing");
    expect(result.metrics.imagesWithoutAlt).toBe(0);
  });

  it("marca imágenes sin atributo alt", async () => {
    const html = `<!doctype html><html><head><title>t</title></head><body><h1>t</h1><img src="a.png"/></body></html>`;
    const result = await analyzeSeo({ html, finalUrl: BASE_URL, maxLinksChecked: 0 });

    expect(findingIds(result)).toContain("seo.img-alt-missing");
  });

  it("marca sitios no HTTPS como críticos", async () => {
    const html = `<!doctype html><html><head><title>t</title></head><body><h1>t</h1></body></html>`;
    const result = await analyzeSeo({ html, finalUrl: "http://sitio-inseguro.invalid/", maxLinksChecked: 0 });

    const finding = result.findings.find((f) => f.id === "seo.no-https");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("critical");
  });
});
