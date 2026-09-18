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

/**
 * Checks whether an IP address belongs to loopback, link-local, or cloud metadata ranges.
 *
 * Unlike {@link isPrivateIp}, this function intentionally permits RFC 1918 private LAN ranges
 * (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 and IPv6 ULA fc00::/7) so self-hosted instances
 * and local devices (cameras, NAS, Home Assistant) can be reached.
 *
 * It strictly blocks SSRF attack vectors against:
 * - **IPv4 / IPv6 Loopback** (`127.0.0.0/8`, `::1`): prevents probing host services (e.g. internal DBs/APIs).
 * - **IPv4 / IPv6 Link-Local & Cloud Metadata** (`169.254.0.0/16`, `fe80::/10`): prevents querying
 *   cloud instance metadata services (e.g., AWS/GCP/Azure IMDS at `169.254.169.254` which leaks IAM tokens).
 * - **Unspecified / Current network** (`0.0.0.0/8`, `::`): prevents routing to current host listeners.
 * - **IPv4-mapped IPv6** (`::ffff:x.x.x.x`): unwrapped and checked recursively.
 *
 * @param ip - An IPv4 or IPv6 address string (can be IPv4-mapped IPv6).
 * @returns `true` if the IP is loopback, link-local, or metadata; otherwise `false`.
 */
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
    return a === 169 && b === 254;
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

function isAllowedDevLoopback(ip: string): boolean {
  return process.env.NODE_ENV !== 'production' && (ip === '127.0.0.1' || ip === '::1');
}

function assertIpNotRestricted(ip: string, hostContext?: string): void {
  if (isLoopbackOrMetadataIp(ip) && !isAllowedDevLoopback(ip)) {
    const message = hostContext
      ? `Blocked host "${hostContext}" resolves to restricted address ${ip}`
      : `Blocked address: ${ip}`;
    throw new Error(message);
  }
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
    assertIpNotRestricted(host);
    return;
  }

  const addresses = await lookup(host, { all: true });
  for (const { address } of addresses) {
    assertIpNotRestricted(address, host);
  }
}

async function assertUrlAllowed(url: URL, isEntry: boolean, allowPrivateLan = false): Promise<void> {
  const isAllowedHttp = (isEntry && isDevLocalUrl(url)) || (allowPrivateLan && url.protocol === 'http:');

  if (url.protocol !== 'https:' && !isAllowedHttp) {
    throw new Error(`Blocked protocol: ${url.protocol}`);
  }

  if (isEntry && isDevLocalUrl(url)) {
    return;
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
