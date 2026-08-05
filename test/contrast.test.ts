import { describe, expect, it } from "vitest";
import { contrastRatio, evaluateWcagContrast, flattenOnBackground, parseCssColor } from "../src/lib/contrast.js";

describe("parseCssColor", () => {
  it("parsea rgb()", () => {
    expect(parseCssColor("rgb(255, 0, 0)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("parsea rgba() con alpha", () => {
    expect(parseCssColor("rgba(0, 0, 0, 0.5)")).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
  });

  it("devuelve null para valores no soportados", () => {
    expect(parseCssColor("transparent")).toBeNull();
  });
});

describe("contrastRatio", () => {
  it("negro sobre blanco da un ratio de 21:1", () => {
    const black = { r: 0, g: 0, b: 0, a: 1 };
    const white = { r: 255, g: 255, b: 255, a: 1 };
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
  });

  it("mismo color da un ratio de 1:1", () => {
    const gray = { r: 128, g: 128, b: 128, a: 1 };
    expect(contrastRatio(gray, gray)).toBeCloseTo(1, 5);
  });
});

describe("evaluateWcagContrast", () => {
  it("texto normal requiere 4.5:1 para AA", () => {
    expect(evaluateWcagContrast(4.4, false).passesAA).toBe(false);
    expect(evaluateWcagContrast(4.6, false).passesAA).toBe(true);
  });

  it("texto grande solo requiere 3:1 para AA", () => {
    expect(evaluateWcagContrast(3.2, true).passesAA).toBe(true);
    expect(evaluateWcagContrast(3.2, false).passesAA).toBe(false);
  });
});

describe("flattenOnBackground", () => {
  it("no modifica un color completamente opaco", () => {
    const fg = { r: 10, g: 20, b: 30, a: 1 };
    const bg = { r: 255, g: 255, b: 255, a: 1 };
    expect(flattenOnBackground(fg, bg)).toEqual(fg);
  });

  it("compone un color semitransparente sobre el fondo", () => {
    const fg = { r: 0, g: 0, b: 0, a: 0.5 };
    const bg = { r: 255, g: 255, b: 255, a: 1 };
    const result = flattenOnBackground(fg, bg);
    expect(result.r).toBeCloseTo(127.5, 1);
  });
});
