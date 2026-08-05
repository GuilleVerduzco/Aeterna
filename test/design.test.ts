import { describe, expect, it } from "vitest";
import { analyzeDesign } from "../src/analyzers/design.js";

describe("analyzeDesign", () => {
  it("detecta contraste insuficiente contra fondo blanco asumido", () => {
    const result = analyzeDesign({
      computedStyles: {
        fontsUsed: ["Arial"],
        colorsUsed: ["rgb(221, 221, 221)", "rgba(0, 0, 0, 0)"],
        textSamples: [
          {
            selector: "p",
            color: "rgb(221, 221, 221)",
            backgroundColor: "rgba(0, 0, 0, 0)",
            fontSize: "14px",
            fontWeight: "400",
            text: "texto de bajo contraste",
          },
        ],
      },
      viewportOverflow: [],
    });

    expect(result.findings.map((f) => f.id)).toContain("design.contrast-aa-fail");
  });

  it("no marca contraste cuando el texto cumple AA", () => {
    const result = analyzeDesign({
      computedStyles: {
        fontsUsed: ["Arial"],
        colorsUsed: ["rgb(0, 0, 0)", "rgb(255, 255, 255)"],
        textSamples: [
          {
            selector: "p",
            color: "rgb(0, 0, 0)",
            backgroundColor: "rgb(255, 255, 255)",
            fontSize: "16px",
            fontWeight: "400",
            text: "texto con buen contraste",
          },
        ],
      },
      viewportOverflow: [],
    });

    expect(result.findings.map((f) => f.id)).not.toContain("design.contrast-aa-fail");
  });

  it("detecta desbordamiento horizontal por viewport", () => {
    const result = analyzeDesign({
      computedStyles: { fontsUsed: [], colorsUsed: [], textSamples: [] },
      viewportOverflow: [{ hasHorizontalOverflow: true, scrollWidth: 3000, clientWidth: 390 }],
    });

    expect(result.findings.map((f) => f.id)).toContain("design.overflow-mobile");
  });

  it("marca dispersión de familias tipográficas", () => {
    const result = analyzeDesign({
      computedStyles: {
        fontsUsed: ["Arial", "Georgia", "Times", "Verdana", "Courier", "Helvetica"],
        colorsUsed: [],
        textSamples: [],
      },
      viewportOverflow: [],
    });

    expect(result.findings.map((f) => f.id)).toContain("design.font-family-sprawl");
  });
});
