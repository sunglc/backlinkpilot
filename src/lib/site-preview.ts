import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const PREVIEW_TIMEOUT_MS = 8000;
const MAX_CONTENT_LENGTH = 512_000;

export interface SitePreviewResult {
  normalizedUrl: string;
  hostname: string;
  name: string;
  description: string;
  detectedFrom: {
    name: string;
    description: string;
  };
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll(/&amp;/g, "&")
    .replaceAll(/&quot;/g, '"')
    .replaceAll(/&#39;/g, "'")
    .replaceAll(/&lt;/g, "<")
    .replaceAll(/&gt;/g, ">")
    .replaceAll(/&nbsp;/g, " ");
}

function cleanText(value: string) {
  return decodeHtmlEntities(value.replaceAll(/\s+/g, " ").trim());
}

function stripTags(value: string) {
  return cleanText(value.replaceAll(/<[^>]*>/g, " "));
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function extractMetaContent(html: string, key: string, attribute: "name" | "property") {
  const pattern = new RegExp(
    `<meta[^>]+${attribute}=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${key}["'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);
  return cleanText(match?.[1] || match?.[2] || "");
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripTags(match?.[1] || "");
}

function extractFirstHeading(html: string) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return stripTags(match?.[1] || "");
}

function ensureUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Please enter a website URL.");
  }

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("Please enter a valid website URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http:// and https:// URLs are supported.");
  }

  return url;
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isPrivateAddress(hostname: string) {
  const version = isIP(hostname);
  if (version === 4) {
    return isPrivateIpv4(hostname);
  }
  if (version === 6) {
    return isPrivateIpv6(hostname);
  }
  return false;
}

async function assertPublicHostname(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "host.docker.internal"
  ) {
    throw new Error("Local or internal hosts are not allowed.");
  }

  if (isPrivateAddress(hostname)) {
    throw new Error("Private network hosts are not allowed.");
  }

  try {
    const addresses = await lookup(hostname, { all: true });
    if (addresses.some((entry) => isPrivateAddress(entry.address))) {
      throw new Error("Private network hosts are not allowed.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("not allowed")) {
      throw error;
    }
    throw new Error("Could not resolve that hostname.");
  }
}

function fallbackNameFromHostname(hostname: string) {
  const root = hostname.replace(/^www\./, "").split(".")[0] || hostname;
  return root
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function fetchSitePreview(input: string): Promise<SitePreviewResult> {
  const url = ensureUrl(input);
  await assertPublicHostname(url);

  const response = await fetch(url, {
    headers: {
      "user-agent":
        "BacklinkPilotBot/1.0 (+https://backlinkpilot.app; onboarding site preview)",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Website returned ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("That URL did not return an HTML page.");
  }

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > MAX_CONTENT_LENGTH) {
    throw new Error("That page is too large to preview automatically.");
  }

  const html = await response.text();
  const ogTitle = extractMetaContent(html, "og:title", "property");
  const ogDescription = extractMetaContent(html, "og:description", "property");
  const metaTitle = extractMetaContent(html, "twitter:title", "name");
  const metaDescription = extractMetaContent(html, "description", "name");
  const title = extractTitle(html);
  const heading = extractFirstHeading(html);

  const nameSourceCandidates = [
    ["og:title", ogTitle],
    ["twitter:title", metaTitle],
    ["title", title],
    ["h1", heading],
  ] as const;
  const descriptionSourceCandidates = [
    ["og:description", ogDescription],
    ["meta description", metaDescription],
  ] as const;

  const nameSource = nameSourceCandidates.find(([, value]) => value);
  const descriptionSource = descriptionSourceCandidates.find(([, value]) => value);

  const name = truncate(
    nameSource?.[1] || fallbackNameFromHostname(url.hostname),
    80
  );
  const description = truncate(
    descriptionSource?.[1] ||
      `BacklinkPilot detected ${name} from ${url.hostname}. Add a short, benefit-driven description before saving.`,
    240
  );

  return {
    normalizedUrl: url.toString(),
    hostname: url.hostname,
    name,
    description,
    detectedFrom: {
      name: nameSource?.[0] || "hostname",
      description: descriptionSource?.[0] || "fallback",
    },
  };
}
