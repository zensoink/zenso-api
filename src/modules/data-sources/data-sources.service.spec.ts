import { DataSourcesService } from './data-sources.service';
import { IcsSource } from './sources/ics.source';

describe('DataSourcesService', () => {
  let service: DataSourcesService;
  let mockHandler: { type: string; resolve: jest.Mock };

  beforeEach(() => {
    service = new DataSourcesService(new IcsSource());
    mockHandler = {
      type: 'mock',
      resolve: jest.fn().mockResolvedValue({ ok: true, events: [] }),
    };
    service.register(mockHandler);
  });

  describe('registry dispatch', () => {
    it('resolves each source and merges under its id', async () => {
      const result = await service.resolveAll([{ id: 'cal', type: 'mock' }], {}, 'Europe/Warsaw', 1);

      expect(result).toEqual({ cal: { ok: true, events: [] } });
      expect(mockHandler.resolve).toHaveBeenCalledWith(expect.objectContaining({ timeZoneIana: 'Europe/Warsaw' }));
    });

    it('skips unknown source types with a warning', async () => {
      const result = await service.resolveAll([{ id: 'cal', type: 'nope' }], {}, 'Europe/Warsaw', 1);

      expect(result).toEqual({});
      expect(mockHandler.resolve).not.toHaveBeenCalled();
    });

    it('passes the user-timezone today to the handler', async () => {
      service.nowFn = () => new Date('2026-08-01T23:00:00Z');

      await service.resolveAll([{ id: 'cal', type: 'mock' }], {}, 'Europe/Warsaw', 1);

      expect(mockHandler.resolve).toHaveBeenCalledWith(expect.objectContaining({ today: '2026-08-02' }));
    });
  });

  describe('cache', () => {
    it('reuses cached results within the TTL', async () => {
      const dataSources = [{ id: 'cal', type: 'mock' }];

      await service.resolveAll(dataSources, {}, 'Europe/Warsaw', 1);
      await service.resolveAll(dataSources, {}, 'Europe/Warsaw', 1);

      expect(mockHandler.resolve).toHaveBeenCalledTimes(1);
    });

    it('re-resolves after the TTL expires', async () => {
      service.nowFn = () => new Date('2026-08-01T00:00:00Z');
      const dataSources = [{ id: 'cal', type: 'mock', refresh_ttl: 1 }];

      await service.resolveAll(dataSources, {}, 'Europe/Warsaw', 1);
      service.nowFn = () => new Date('2026-08-01T00:05:01Z');
      await service.resolveAll(dataSources, {}, 'Europe/Warsaw', 1);

      expect(mockHandler.resolve).toHaveBeenCalledTimes(2);
    });

    it('keys the cache on configJson', async () => {
      await service.resolveAll([{ id: 'cal', type: 'mock' }], { a: 1 }, 'Europe/Warsaw', 1);
      await service.resolveAll([{ id: 'cal', type: 'mock' }], { a: 2 }, 'Europe/Warsaw', 1);

      expect(mockHandler.resolve).toHaveBeenCalledTimes(2);
    });

    it('rolls over at midnight via the today key', async () => {
      service.nowFn = () => new Date('2026-08-01T21:59:59Z');

      await service.resolveAll([{ id: 'cal', type: 'mock' }], {}, 'Europe/Warsaw', 1);
      service.nowFn = () => new Date('2026-08-01T22:00:00Z');
      await service.resolveAll([{ id: 'cal', type: 'mock' }], {}, 'Europe/Warsaw', 1);

      expect(mockHandler.resolve).toHaveBeenCalledTimes(2);
    });
  });

  describe('failure handling', () => {
    it('propagates the fallback returned by the handler', async () => {
      mockHandler.resolve.mockResolvedValue({ today: '2026-08-01', events: [] });

      const result = await service.resolveAll([{ id: 'cal', type: 'mock' }], {}, 'Europe/Warsaw', 1);

      expect(result).toEqual({ cal: { today: '2026-08-01', events: [] } });
    });

    it('merges an empty object when the handler throws and never crashes', async () => {
      mockHandler.resolve.mockRejectedValue(new Error('boom'));

      const result = await service.resolveAll([{ id: 'cal', type: 'mock' }], {}, 'Europe/Warsaw', 1);

      expect(result).toEqual({ cal: {} });
    });
  });
});
