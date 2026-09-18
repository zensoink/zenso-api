import { lookup } from 'node:dns/promises';

import { guardedFetch, guardedFetchBinary, isLoopbackOrMetadataIp, isPrivateIp } from './guarded-fetch';

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

const PUBLIC_IP = [{ address: '93.184.216.34', family: 4 }];

describe('isPrivateIp', () => {
  it('blocks IPv4 private and link-local ranges', () => {
    expect(isPrivateIp('0.0.0.0')).toBe(true);
    expect(isPrivateIp('10.0.0.5')).toBe(true);
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('169.254.10.10')).toBe(true);
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('172.31.255.255')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
  });

  it('allows public IPv4 addresses', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
    expect(isPrivateIp('172.15.0.1')).toBe(false);
    expect(isPrivateIp('172.32.0.1')).toBe(false);
    expect(isPrivateIp('192.169.1.1')).toBe(false);
  });

  it('blocks IPv6 private, loopback, and link-local ranges', () => {
    expect(isPrivateIp('::')).toBe(true);
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('fc00::1')).toBe(true);
    expect(isPrivateIp('fd12:3456::1')).toBe(true);
    expect(isPrivateIp('fe80::1')).toBe(true);
    expect(isPrivateIp('febf::1')).toBe(true);
  });

  it('allows public IPv6 addresses', () => {
    expect(isPrivateIp('2606:4700::1111')).toBe(false);
    expect(isPrivateIp('2001:4860:4860::8888')).toBe(false);
  });

  it('blocks IPv4-mapped private addresses', () => {
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);
    expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false);
  });
});

describe('isLoopbackOrMetadataIp', () => {
  it('blocks loopback and cloud metadata ranges', () => {
    expect(isLoopbackOrMetadataIp('0.0.0.0')).toBe(true);
    expect(isLoopbackOrMetadataIp('127.0.0.1')).toBe(true);
    expect(isLoopbackOrMetadataIp('127.255.255.255')).toBe(true);
    expect(isLoopbackOrMetadataIp('169.254.169.254')).toBe(true);
    expect(isLoopbackOrMetadataIp('169.254.1.1')).toBe(true);
    expect(isLoopbackOrMetadataIp('::')).toBe(true);
    expect(isLoopbackOrMetadataIp('::1')).toBe(true);
    expect(isLoopbackOrMetadataIp('fe80::1')).toBe(true);
    expect(isLoopbackOrMetadataIp('febf::1')).toBe(true);
  });

  it('allows private LAN and public addresses', () => {
    expect(isLoopbackOrMetadataIp('10.0.0.1')).toBe(false);
    expect(isLoopbackOrMetadataIp('192.168.1.1')).toBe(false);
    expect(isLoopbackOrMetadataIp('172.16.0.1')).toBe(false);
    expect(isLoopbackOrMetadataIp('172.31.255.255')).toBe(false);
    expect(isLoopbackOrMetadataIp('fc00::1')).toBe(false);
    expect(isLoopbackOrMetadataIp('fd12:3456::1')).toBe(false);
    expect(isLoopbackOrMetadataIp('8.8.8.8')).toBe(false);
    expect(isLoopbackOrMetadataIp('2606:4700::1111')).toBe(false);
  });

  it('handles IPv4-mapped IPv6 correctly', () => {
    expect(isLoopbackOrMetadataIp('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackOrMetadataIp('::ffff:169.254.169.254')).toBe(true);
    expect(isLoopbackOrMetadataIp('::ffff:192.168.1.1')).toBe(false);
    expect(isLoopbackOrMetadataIp('::ffff:8.8.8.8')).toBe(false);
  });
});

describe('guardedFetch', () => {
  beforeEach(() => {
    (lookup as jest.Mock).mockReset();
    jest.restoreAllMocks();
  });

  it('rejects non-https entry URLs', async () => {
    await expect(guardedFetch('http://example.com/feed.ics')).rejects.toThrow('Blocked protocol');
  });

  it('allows http://127.0.0.1 as an entry URL in non-production', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await expect(guardedFetch('http://127.0.0.1:8123/feed.ics')).resolves.toBe('ok');
  });

  it('rejects a hostname that resolves to a private address', async () => {
    (lookup as jest.Mock).mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

    await expect(guardedFetch('https://internal.corp/feed.ics')).rejects.toThrow('private address');
  });

  it('allows a public https URL and returns the body', async () => {
    (lookup as jest.Mock).mockResolvedValue(PUBLIC_IP);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response('BEGIN:VCALENDAR', { status: 200, headers: { 'content-type': 'text/calendar' } })
      );

    await expect(guardedFetch('https://public.example/feed.ics')).resolves.toBe('BEGIN:VCALENDAR');
  });

  it('rejects a redirect to a private http address', async () => {
    (lookup as jest.Mock).mockResolvedValue(PUBLIC_IP);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 302, headers: { location: 'http://127.0.0.1:9/steal' } }));

    await expect(guardedFetch('https://public.example/feed.ics')).rejects.toThrow('Blocked protocol');
  });

  it('rejects a redirect to a private https address', async () => {
    (lookup as jest.Mock).mockResolvedValue(PUBLIC_IP);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/steal' } }));

    await expect(guardedFetch('https://public.example/feed.ics')).rejects.toThrow('Blocked private address');
  });

  it('follows redirects when each hop is public', async () => {
    (lookup as jest.Mock).mockResolvedValue(PUBLIC_IP);
    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://public.example/v2' } }))
      .mockResolvedValueOnce(new Response('redirected', { status: 200 }));

    await expect(guardedFetch('https://public.example/feed.ics')).resolves.toBe('redirected');
  });

  it('stops after the redirect limit', async () => {
    (lookup as jest.Mock).mockResolvedValue(PUBLIC_IP);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://public.example/loop' } }));

    await expect(guardedFetch('https://public.example/feed.ics')).rejects.toThrow('Too many redirects');
  });

  it('rejects a non-2xx response', async () => {
    (lookup as jest.Mock).mockResolvedValue(PUBLIC_IP);
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    await expect(guardedFetch('https://public.example/feed.ics')).rejects.toThrow('HTTP 500');
  });

  it('rejects responses larger than 5 MB', async () => {
    (lookup as jest.Mock).mockResolvedValue(PUBLIC_IP);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200, headers: { 'content-length': String(6 * 1024 * 1024) } }));

    await expect(guardedFetch('https://public.example/feed.ics')).rejects.toThrow('5 MB limit');
  });
});

describe('guardedFetchBinary', () => {
  beforeEach(() => {
    (lookup as jest.Mock).mockReset();
    jest.restoreAllMocks();
  });

  it('allows private LAN HTTP address when allowPrivateLan is true', async () => {
    const fakeBuffer = Buffer.from('image-bytes');
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(fakeBuffer, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })
    );

    const result = await guardedFetchBinary('http://192.168.1.50/pic.png', { allowPrivateLan: true });
    expect(result.contentType).toBe('image/png');
    expect(result.buffer).toEqual(fakeBuffer);
  });

  it('rejects metadata address even when allowPrivateLan is true', async () => {
    await expect(
      guardedFetchBinary('http://169.254.169.254/latest/meta-data', { allowPrivateLan: true })
    ).rejects.toThrow('Blocked address: 169.254.169.254');
  });

  it('rejects LAN HTTP address when allowPrivateLan is false', async () => {
    await expect(guardedFetchBinary('http://192.168.1.50/pic.png', { allowPrivateLan: false })).rejects.toThrow(
      'Blocked protocol: http:'
    );
  });

  it('rejects unsupported protocol even when allowPrivateLan is true', async () => {
    await expect(guardedFetchBinary('ftp://192.168.1.50/pic.png', { allowPrivateLan: true })).rejects.toThrow(
      'Blocked protocol: ftp:'
    );
  });
});
