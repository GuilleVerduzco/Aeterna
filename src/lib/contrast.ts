/** Utilidades de contraste de color según WCAG 2.1 (https://www.w3.org/TR/WCAG21/#contrast-minimum) */

export interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

const RGBA_RE = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i;

export function parseCssColor(value: string): RGB | null {
  const match = RGBA_RE.exec(value.trim());
  if (!match) return null;
  const [, r, g, b, a] = match;
  return {
    r: Number(r),
    g: Number(g),
    b: Number(b),
    a: a === undefined ? 1 : Number(a),
  };
}

function relativeLuminanceChannel(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: RGB): number {
  return (
    0.2126 * relativeLuminanceChannel(r) +
    0.7152 * relativeLuminanceChannel(g) +
    0.0722 * relativeLuminanceChannel(b)
  );
}

/** Compone `fg` sobre `bg` cuando `fg` tiene transparencia, para poder calcular el contraste real percibido. */
export function flattenOnBackground(fg: RGB, bg: RGB): RGB {
  if (fg.a >= 1) return fg;
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface WcagVerdict {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
}

/** @param isLargeText Texto >=18pt, o >=14pt en negrita, según WCAG */
export function evaluateWcagContrast(ratio: number, isLargeText: boolean): WcagVerdict {
  const aaThreshold = isLargeText ? 3 : 4.5;
  const aaaThreshold = isLargeText ? 4.5 : 7;
  return {
    ratio,
    passesAA: ratio >= aaThreshold,
    passesAAA: ratio >= aaaThreshold,
  };
}
