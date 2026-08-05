import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { config } from "../config.js";

export class UnsafeUrlError extends Error {}

const IPV4_PRIVATE_RANGES: [number, number][] = [
  [ipv4ToInt("0.0.0.0"), ipv4ToInt("0.255.255.255")], // "this" network
  [ipv4ToInt("10.0.0.0"), ipv4ToInt("10.255.255.255")], // RFC1918
  [ipv4ToInt("100.64.0.0"), ipv4ToInt("100.127.255.255")], // CGNAT
  [ipv4ToInt("127.0.0.0"), ipv4ToInt("127.255.255.255")], // loopback
  [ipv4ToInt("169.254.0.0"), ipv4ToInt("169.254.255.255")], // link-local / cloud metadata
  [ipv4ToInt("172.16.0.0"), ipv4ToInt("172.31.255.255")], // RFC1918
  [ipv4ToInt("192.0.0.0"), ipv4ToInt("192.0.0.255")], // IETF protocol assignments
  [ipv4ToInt("192.168.0.0"), ipv4ToInt("192.168.255.255")], // RFC1918
  [ipv4ToInt("198.18.0.0"), ipv4ToInt("198.19.255.255")], // benchmarking
  [ipv4ToInt("224.0.0.0"), ipv4ToInt("255.255.255.255")], // multicast/reserved
];

function ipv4ToInt(ip: string): number {
  return ip
    .split(".")
    .map(Number)
    .reduce((acc, octet) => acc * 256 + octet, 0);
}

function isPrivateIpv4(ip: string): boolean {
  const asInt = ipv4ToInt(ip);
  return IPV4_PRIVATE_RANGES.some(([start, end]) => asInt >= start && asInt <= end);
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true; // loopback
  if (normalized === "::") return true;
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local (fc00::/7)
  if (normalized.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 — revalida como IPv4
    const mapped = normalized.replace("::ffff:", "");
    if (isIP(mapped) === 4) return isPrivateIpv4(mapped);
  }
  return false;
}

function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true; // no es una IP reconocible: por seguridad, se trata como no válida
}

const BLOCKED_HOSTNAME_SUFFIXES = [".local", ".internal", ".localhost"];

/**
 * Valida que una URL enviada por un usuario apunte a un host público y no a
 * infraestructura interna (loopback, redes privadas RFC1918, link-local /
 * metadata de nube, etc.), para evitar SSRF a través del crawler.
 *
 * Nota: esto valida en el momento de la solicitud; no protege por sí solo
 * contra DNS rebinding (que el registro DNS cambie entre esta validación y
 * la navegación real de Playwright). Para un aislamiento más fuerte en
 * producción, ejecuta el análisis en una red/egress restringida.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<void> {
  if (config.allowPrivateUrls) return;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("La URL no es válida.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError("Solo se permiten URLs http:// o https://.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || BLOCKED_HOSTNAME_SUFFIXES.some((s) => hostname.endsWith(s))) {
    throw new UnsafeUrlError("No se permiten hosts internos/locales.");
  }

  const directIpVersion = isIP(hostname);
  if (directIpVersion !== 0) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new UnsafeUrlError("La URL apunta a una dirección IP privada o reservada.");
    }
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new UnsafeUrlError("No se pudo resolver el dominio de la URL.");
  }

  if (addresses.length === 0 || addresses.some((a) => isPrivateOrReservedIp(a.address))) {
    throw new UnsafeUrlError("El dominio resuelve a una dirección IP privada o reservada.");
  }
}
