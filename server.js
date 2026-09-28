import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = process.cwd();
const SHARE_HOSTS = new Set(['dreamina.capcut.com', 'www.capcut.com', 'capcut.com']);
const downloads = new Map();
const MAX_HTML_BYTES = 2_000_000;
const proxyUrl = process.env.OUTBOUND_PROXY_URL;

let proxyDispatcher;
if (proxyUrl) {
  try {
    const url = new URL(proxyUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS proxy URL.');
    proxyDispatcher = new ProxyAgent(url.href);
    console.log('Outbound Dreamina requests will use the configured proxy.');
  } catch (error) {
    throw new Error(`Invalid OUTBOUND_PROXY_URL: ${error.message}`);
  }
}

function fetchUpstream(input, options = {}) {
  // Deliberately used only for remote Dreamina/media requests. Requests from a
  // visitor to this app, health checks, and other host traffic are unaffected.
  return undiciFetch(input, proxyDispatcher ? { ...options, dispatcher: proxyDispatcher } : options);
}

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

function isApprovedShareUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && SHARE_HOSTS.has(url.hostname.toLowerCase());
  } catch { return false; }
}

function isMediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /\.(mp4|webm|mov|m3u8)(?:$|[?#])/i.test(url.pathname);
  } catch { return false; }
}

async function fetchFollowingApprovedRedirects(input) {
  let target = new URL(input);
  for (let hop = 0; hop < 6; hop += 1) {
    if (!SHARE_HOSTS.has(target.hostname.toLowerCase())) throw new Error('The link redirected outside approved Dreamina/CapCut hosts.');
    const response = await fetchUpstream(target, {
      redirect: 'manual',
      headers: { 'user-agent': 'DreaminaVideoExtractor/1.0', accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(15_000)
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('The share page returned an invalid redirect.');
      target = new URL(location, target);
      continue;
    }
    if (!response.ok) throw new Error(`The share page returned HTTP ${response.status}.`);
    const text = await response.text();
    if (text.length > MAX_HTML_BYTES) throw new Error('The share page is too large to inspect safely.');
    if (/Coming soon to your country or region/i.test(text)) {
      throw new Error('Dreamina returned its regional-availability page instead of the shared video. Try again only from a region where Dreamina makes this public page available.');
    }
    return { html: text, pageUrl: target.href };
  }
  throw new Error('Too many redirects from the share link.');
}

function unescapeUrl(value) {
  let decoded = value
    .replaceAll('\\u002F', '/')
    .replaceAll('\\u0026', '&')
    .replaceAll('&amp;', '&');
  while (decoded.includes('\\/')) decoded = decoded.replaceAll('\\/', '/');
  return decoded;
}

export function extractCandidates(html, pageUrl) {
  const values = new Set();
  const source = unescapeUrl(html);
  const addCandidate = (candidate, isDeclaredVideo = false) => {
    try {
      const absolute = new URL(unescapeUrl(candidate), pageUrl).href;
      if ((isDeclaredVideo || isMediaUrl(absolute)) && new URL(absolute).protocol === 'https:') values.add(absolute);
    } catch { /* ignore malformed embedded values */ }
  };

  // Open Graph tags can put content before property/name, so inspect each tag rather than
  // assuming a fixed attribute order.
  for (const tag of source.matchAll(/<meta\b[^>]*>/gi)) {
    const property = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag[0])?.[1]?.toLowerCase();
    const content = /content\s*=\s*["']([^"']+)["']/i.exec(tag[0])?.[1];
    if (content && ['og:video', 'og:video:url', 'twitter:player:stream'].includes(property)) addCandidate(content, true);
  }

  const declaredVideoPatterns = [
    /<(?:video|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi,
    /["'](?:video_url|videoUrl|play_url|playUrl|download_url|downloadUrl)["']\s*:\s*["']([^"']+)["']/gi
  ];
  for (const pattern of declaredVideoPatterns) {
    for (const match of source.matchAll(pattern)) {
      addCandidate(match[1], true);
    }
  }

  // Capture direct file URLs in normal and JSON-escaped form. These need an explicit
  // media extension because they have not been declared as a video by the page.
  for (const match of source.matchAll(/https?:\/\/[^"'\\\s<>]+?\.(?:mp4|webm|mov|m3u8)(?:[?#][^"'\\\s<>]*)?/gi)) addCandidate(match[0]);
  return [...values].slice(0, 10);
}

function serveFile(response, name, type) {
  const file = join(ROOT, 'public', name);
  if (!existsSync(file)) return false;
  response.writeHead(200, { 'content-type': type });
  createReadStream(file).pipe(response);
  return true;
}

async function handleExtract(request, response) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 10_000) return json(response, 413, { error: 'Request is too large.' });
  }
  let shareUrl;
  try { shareUrl = JSON.parse(body).url; } catch { return json(response, 400, { error: 'Enter a valid share link.' }); }
  if (!isApprovedShareUrl(shareUrl)) return json(response, 400, { error: 'Use an https Dreamina or CapCut share link.' });
  try {
    const { html, pageUrl } = await fetchFollowingApprovedRedirects(shareUrl);
    const candidates = extractCandidates(html, pageUrl);
    if (!candidates.length) return json(response, 404, { error: 'No public direct-video URL was exposed on this page. It may be region-restricted, private, or use protected streaming.' });
    const files = candidates.map((url) => {
      const token = randomUUID();
      downloads.set(token, { url, expires: Date.now() + 10 * 60_000, referer: pageUrl });
      return { type: /\.m3u8(?:$|[?#])/i.test(url) ? 'HLS playlist' : 'Video file', url, downloadUrl: `/api/download/${token}` };
    });
    return json(response, 200, { files });
  } catch (error) { return json(response, 502, { error: error.message || 'Could not retrieve the share page.' }); }
}

async function handleDownload(request, response, token) {
  const item = downloads.get(token);
  downloads.delete(token);
  if (!item || item.expires < Date.now()) return json(response, 410, { error: 'This download link expired. Extract it again.' });
  try {
    const upstream = await fetchUpstream(item.url, { headers: { referer: item.referer, 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60_000) });
    if (!upstream.ok || !upstream.body) return json(response, 502, { error: 'The media host did not provide the file.' });
    const extension = extname(new URL(item.url).pathname) || '.mp4';
    response.writeHead(200, {
      'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
      'content-length': upstream.headers.get('content-length') || undefined,
      'content-disposition': `attachment; filename="dreamina-video${extension}"`,
      'cache-control': 'no-store'
    });
    Readable.fromWeb(upstream.body).pipe(response);
  } catch { json(response, 502, { error: 'The media download failed.' }); }
}

export const server = createServer(async (request, response) => {
  const path = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (request.method === 'GET' && path === '/health') return json(response, 200, { status: 'ok' });
  if (request.method === 'POST' && path === '/api/extract') return handleExtract(request, response);
  if (request.method === 'GET' && path.startsWith('/api/download/')) return handleDownload(request, response, path.slice('/api/download/'.length));
  if (request.method === 'GET' && path === '/') return serveFile(response, 'index.html', 'text/html; charset=utf-8');
  if (request.method === 'GET' && path === '/app.js') return serveFile(response, 'app.js', 'text/javascript; charset=utf-8');
  if (request.method === 'GET' && path === '/styles.css') return serveFile(response, 'styles.css', 'text/css; charset=utf-8');
  json(response, 404, { error: 'Not found.' });
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, HOST, () => console.log(`Dreamina Video Extractor running on ${HOST}:${PORT}`));
}
