import { Test, TestingModule } from '@nestjs/testing';

import { SlotRenderInput } from '../types/slot-render-input';
import { RenderCacheService } from './render-cache.service';

const baseSlots: SlotRenderInput[] = [
  { pluginInstanceId: 1, x: 0, y: 0, w: 400, h: 480, zIndex: 0 },
  {
    pluginInstanceId: 2,
    pluginVersion: '1.0.0',
    configJson: { color: 'red' },
    x: 400,
    y: 0,
    w: 400,
    h: 480,
    zIndex: 1,
  },
];

describe('RenderCacheService', () => {
  let service: RenderCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RenderCacheService],
    }).compile();

    service = module.get<RenderCacheService>(RenderCacheService);
    service.clear();
  });

  describe('generateKey', () => {
    it('returns same key for identical inputs', () => {
      const key1 = service.generateKey(1, 800, 480, baseSlots);
      const key2 = service.generateKey(1, 800, 480, baseSlots);
      expect(key1).toBe(key2);
    });

    it('returns different key when configJson changes', () => {
      const key1 = service.generateKey(1, 800, 480, baseSlots);
      const modifiedSlots: SlotRenderInput[] = [
        ...baseSlots.slice(0, 1),
        { ...baseSlots[1], configJson: { color: 'blue' } },
      ];
      const key2 = service.generateKey(1, 800, 480, modifiedSlots);
      expect(key1).not.toBe(key2);
    });

    it('returns different key when slot position changes', () => {
      const key1 = service.generateKey(1, 800, 480, baseSlots);
      const movedSlots: SlotRenderInput[] = [{ ...baseSlots[0], x: 100, y: 50 }, ...baseSlots.slice(1)];
      const key2 = service.generateKey(1, 800, 480, movedSlots);
      expect(key1).not.toBe(key2);
    });
  });

  describe('get', () => {
    it('returns null for unknown key', () => {
      expect(service.get('nonexistent')).toBeNull();
    });
  });

  describe('set and get', () => {
    it('returns the buffer after set', () => {
      const key = service.generateKey(1, 800, 480, baseSlots);
      const buffer = Buffer.from('test-image-data');
      service.set(key, buffer, 60_000);
      expect(service.get(key)).toEqual(buffer);
    });

    it('returns null after TTL expires', () => {
      const realNow = Date.now;
      const fixedNow = 100_000_000_000;
      Date.now = jest.fn(() => fixedNow);

      const key = service.generateKey(1, 800, 480, baseSlots);
      const buffer = Buffer.from('test-image-data');
      service.set(key, buffer, 1000);

      Date.now = jest.fn(() => fixedNow + 2000);

      expect(service.get(key)).toBeNull();

      Date.now = realNow;
    });
  });

  describe('invalidateScreen', () => {
    it('removes only entries belonging to the specified screenId', () => {
      const key1 = 'key-screen-1';
      const key2 = 'key-screen-2';
      service.set(key1, Buffer.from('screen1-data'), 60_000, 1);
      service.set(key2, Buffer.from('screen2-data'), 60_000, 2);

      service.invalidateScreen(1);

      expect(service.get(key1)).toBeNull();
      expect(service.get(key2)).toEqual(Buffer.from('screen2-data'));
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      const key = service.generateKey(1, 800, 480, baseSlots);
      service.set(key, Buffer.from('data'), 60_000);
      service.clear();
      expect(service.get(key)).toBeNull();
    });
  });
});
