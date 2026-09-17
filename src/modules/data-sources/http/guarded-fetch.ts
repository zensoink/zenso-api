import { lookup } from 'node:dns/promises';

const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 5000;

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function isPrivateIp(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized.startsWith('::ffff:')) {
    return isPrivateIp(normalized.slice(7));
  }

  const v4 = IPV4_RE.exec(normalized);
  if (v4 !== null) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }
    return a === 192 && b === 168;
  }

  if (normalized === '::' || normalized === '::1') {
    return true;
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }
  return (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
}

export function isLoopbackOrMetadataIp(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized.startsWith('::ffff:')) {
    return isLoopbackOrMetadataIp(normalized.slice(7));
  }

  const v4 = IPV4_RE.exec(normalized);
  if (v4 !== null) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 127) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    return false;
  }

  if (normalized === '::' || normalized === '::1') {
    return true;
  }
  return (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
}

function isIpLiteral(host: string): boolean {
  return IPV4_RE.test(host) || host.includes(':');
}

function isDevLocalUrl(url: URL): boolean {
  return url.protocol === 'http:' && url.hostname === '127.0.0.1' && process.env.NODE_ENV !== 'production';
}

async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|]$/g, '');
  if (isIpLiteral(host)) {
    if (isPrivateIp(host)) {
      throw new Error(`Blocked private address: ${host}`);
    }
    return;
  }

  const addresses = await lookup(host, { all: true });
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error(`Blocked host "${host}" resolves to private address ${address}`);
    }
  }
}

async function assertLanHostAllowed(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|]$/g, '');
  if (isIpLiteral(host)) {
    if (isLoopbackOrMetadataIp(host)) {
      if (process.env.NODE_ENV !== 'production' && (host === '127.0.0.1' || host === '::1')) {
        return;
      }
      throw new Error(`Blocked address: ${host}`);
    }
    return;
  }

  const addresses = await lookup(host, { all: true });
  for (const { address } of addresses) {
    if (isLoopbackOrMetadataIp(address)) {
      if (process.env.NODE_ENV !== 'production' && (address === '127.0.0.1' || address === '::1')) {
        continue;
      }
      throw new Error(`Blocked host "${host}" resolves to restricted address ${address}`);
    }
  }
}

async function assertUrlAllowed(url: URL, isEntry: boolean, allowPrivateLan = false): Promise<void> {
  if (url.protocol !== 'https:') {
    if (isEntry && isDevLocalUrl(url)) {
      return;
    }
    if (allowPrivateLan && url.protocol === 'http:') {
      // Allowed protocol for LAN, host validation below enforces restrictions
    } else {
      throw new Error(`Blocked protocol: ${url.protocol}`);
    }
  }
  if (allowPrivateLan) {
    await assertLanHostAllowed(url);
  } else {
    await assertPublicHost(url);
  }
}

async function readBodyBinary(response: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`Response body exceeds ${Math.round(maxBytes / (1024 * 1024))} MB limit`);
  }

  if (!response.body) {
    return Buffer.alloc(0);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`Response body exceeds ${Math.round(maxBytes / (1024 * 1024))} MB limit`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export interface GuardedFetchOptions {
  allowPrivateLan?: boolean;
  maxBodyBytes?: number;
  timeoutMs?: number;
}

export async function guardedFetchBinary(
  inputUrl: string,
  options?: GuardedFetchOptions
): Promise<{ buffer: Buffer; contentType: string }> {
  const allowPrivateLan = options?.allowPrivateLan ?? false;
  const maxBytes = options?.maxBodyBytes ?? MAX_BODY_BYTES;
  const timeoutMs = options?.timeoutMs ?? TIMEOUT_MS;
  let currentUrl = new URL(inputUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertUrlAllowed(currentUrl, hop === 0, allowPrivateLan);

    const response = await fetch(currentUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect (${response.status}) without Location header`);
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${currentUrl.href}`);
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await readBodyBinary(response, maxBytes);
    return { buffer, contentType };
  }

  throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
}

export async function guardedFetch(inputUrl: string, options?: GuardedFetchOptions): Promise<string> {
  const { buffer } = await guardedFetchBinary(inputUrl, options);
  return buffer.toString('utf-8');
}
