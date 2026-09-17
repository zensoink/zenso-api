import * as guardedFetchModule from '../http/guarded-fetch';
import { ImageSource } from './image.source';

describe('ImageSource', () => {
  let source: ImageSource;

  beforeEach(() => {
    source = new ImageSource();
    jest.restoreAllMocks();
  });

  it('has type "image"', () => {
    expect(source.type).toBe('image');
  });

  it('returns unconfigured when url is missing', async () => {
    const result = await source.resolve({
      configJson: {},
      manifestConfig: {},
      timeZoneIana: 'UTC',
      today: '2026-09-17',
    });

    expect(result).toMatchObject({
      src: null,
      url: null,
      empty_reason: 'unconfigured',
    });
    expect(result['fetched_at']).toBeDefined();
  });

  it('returns unconfigured when url is whitespace only', async () => {
    const result = await source.resolve({
      configJson: { url: '   ' },
      manifestConfig: {},
      timeZoneIana: 'UTC',
      today: '2026-09-17',
    });

    expect(result).toMatchObject({
      src: null,
      url: null,
      empty_reason: 'unconfigured',
    });
  });

  it('resolves image url using custom url_field', async () => {
    const buffer = Buffer.from('fake-image-bytes');
    jest.spyOn(guardedFetchModule, 'guardedFetchBinary').mockResolvedValue({
      buffer,
      contentType: 'image/png',
    });

    const result = await source.resolve({
      configJson: { custom_image_url: 'https://example.com/pic.png' },
      manifestConfig: { url_field: 'custom_image_url' },
      timeZoneIana: 'UTC',
      today: '2026-09-17',
    });

    expect(result).toMatchObject({
      src: `data:image/png;base64,${buffer.toString('base64')}`,
      url: 'https://example.com/pic.png',
      empty_reason: null,
    });
  });

  it('fetches image and returns data URI when successful', async () => {
    const buffer = Buffer.from('jpeg-bytes');
    jest.spyOn(guardedFetchModule, 'guardedFetchBinary').mockResolvedValue({
      buffer,
      contentType: 'image/jpeg; charset=utf-8',
    });

    const result = await source.resolve({
      configJson: { url: 'https://picsum.photos/800/480' },
      manifestConfig: {},
      timeZoneIana: 'UTC',
      today: '2026-09-17',
    });

    expect(result).toMatchObject({
      src: `data:image/jpeg;base64,${buffer.toString('base64')}`,
      url: 'https://picsum.photos/800/480',
      empty_reason: null,
    });
  });

  it('returns fetch_failed when guardedFetchBinary fails', async () => {
    jest.spyOn(guardedFetchModule, 'guardedFetchBinary').mockRejectedValue(new Error('Network error'));

    const result = await source.resolve({
      configJson: { url: 'https://picsum.photos/800/480' },
      manifestConfig: {},
      timeZoneIana: 'UTC',
      today: '2026-09-17',
    });

    expect(result).toMatchObject({
      src: null,
      url: 'https://picsum.photos/800/480',
      empty_reason: 'fetch_failed',
    });
  });
});
