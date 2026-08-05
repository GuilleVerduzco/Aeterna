import { request } from "undici";

export interface SimpleResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export async function fetchText(
  url: string,
  opts: { timeoutMs?: number; method?: "GET" | "HEAD" } = {}
): Promise<SimpleResponse> {
  const { timeoutMs = 10_000, method = "GET" } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await request(url, {
      method,
      signal: controller.signal,
      headersTimeout: timeoutMs,
      bodyTimeout: timeoutMs,
      headers: {
        "user-agent": "AeternaSiteAuditor/1.0 (+https://www.c4b.mx)",
      },
    });
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers)) {
      headers[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : (v ?? "");
    }
    const body = method === "HEAD" ? "" : await res.body.text();
    return { statusCode: res.statusCode, headers, body };
  } finally {
    clearTimeout(timer);
  }
}

export function resolveUrl(maybeRelative: string, base: string): string | null {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}
