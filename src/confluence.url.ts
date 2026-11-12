import { ConfluencePageReference } from './confluence.js';

const NUMERIC_ID = /^\d+$/;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/**
 * Confluence tiny links (/x/<code>) are the page ID as little-endian bytes,
 * base64-encoded with '/'→'-', '+'→'_' and trailing 'A'/'=' stripped.
 */
export function decodeTinyLinkPageId(code: string): string {
  let base64 = code.replace(/-/g, '/').replace(/_/g, '+');
  while (base64.length % 4 !== 0) {
    base64 += 'A';
  }
  const bytes = Buffer.from(base64, 'base64');
  let pageId = 0n;
  for (let index = bytes.length - 1; index >= 0; index--) {
    pageId = (pageId << 8n) | BigInt(bytes[index]);
  }
  return pageId.toString();
}

function decodePathSegment(segment: string): string {
  return decodeURIComponent(segment.replace(/\+/g, ' '));
}

/**
 * Recognizes a page ID or any common Confluence Server/DC page URL form:
 * viewpage.action?pageId=…, viewpage.action?spaceKey=…&title=…,
 * /spaces/KEY/pages/123/…, /display/KEY/Title and /x/<tiny>.
 */
export function parsePageReference(
  input: string,
): ConfluencePageReference | null {
  const trimmed = input.trim();
  if (NUMERIC_ID.test(trimmed)) {
    return { pageId: trimmed };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const pageIdParam = url.searchParams.get('pageId');
  if (pageIdParam && NUMERIC_ID.test(pageIdParam)) {
    return { pageId: pageIdParam };
  }

  const spaceKeyParam = url.searchParams.get('spaceKey');
  const titleParam = url.searchParams.get('title');
  if (spaceKeyParam && titleParam) {
    return { spaceKey: spaceKeyParam, title: titleParam };
  }

  const path = url.pathname;

  const pagesMatch = path.match(/\/pages\/(\d+)(?:\/|$)/);
  if (pagesMatch) {
    return { pageId: pagesMatch[1] };
  }

  const tinyMatch = path.match(/\/x\/([A-Za-z0-9_-]+)\/?$/);
  if (tinyMatch) {
    return { pageId: decodeTinyLinkPageId(tinyMatch[1]) };
  }

  const displayMatch = path.match(/\/display\/([^/]+)\/([^/]+)\/?$/);
  if (displayMatch) {
    return {
      spaceKey: decodePathSegment(displayMatch[1]),
      title: decodePathSegment(displayMatch[2]),
    };
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds page URLs on the given Confluence host inside free text such as
 * Jira wiki markup ([title|url]) or plain pasted links.
 */
export function extractConfluencePageUrls(
  text: string,
  confluenceBaseUrl: string,
): string[] {
  const { host } = new URL(confluenceBaseUrl);
  const pattern = new RegExp(
    `https?://${escapeRegExp(host)}/[^\\s|\\[\\]<>"'(){}]+`,
    'g',
  );
  const urls = (text.match(pattern) ?? [])
    .map((url) => url.replace(TRAILING_PUNCTUATION, ''))
    .filter((url) => parsePageReference(url) !== null);
  return [...new Set(urls)];
}

export function isUrlOnHost(url: string, baseUrl: string): boolean {
  try {
    return new URL(url).host === new URL(baseUrl).host;
  } catch {
    return false;
  }
}
