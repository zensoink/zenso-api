import { IsolateService } from './isolate.service';

describe('IsolateService', () => {
  let service: IsolateService;

  beforeEach(() => {
    service = new IsolateService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('runs a trivial script and returns its completion value', () => {
    expect(service.runUntrusted('40 + 2')).toBe(42);
  });

  it('has no Node globals in the jail', () => {
    const noGlobals: unknown = service.runUntrusted(
      'typeof process === "undefined" && typeof require === "undefined" && typeof fetch === "undefined"'
    );

    expect(noGlobals).toBe(true);
    expect(service.runUntrusted('typeof process')).toBe('undefined');
  });

  it('kills an infinite loop via timeout', () => {
    expect(() => service.runUntrusted('while (true) {}', 200)).toThrow();
  });

  it('throws on syntax errors at compile time', () => {
    expect(() => service.compile('const = ;;;')).toThrow();
  });

  it('screenBundle reports the ready flag for a well-behaved bundle', () => {
    const result = service.screenBundle('globalThis.__ZENSO_READY__ = true;');

    expect(result).toEqual({ compiled: true, readyFlag: true });
  });

  it('screenBundle reports missing ready flag without throwing', () => {
    const result = service.screenBundle('const x = 1;');

    expect(result.compiled).toBe(true);
    expect(result.readyFlag).toBe(false);
  });

  it('screenBundle never throws, even on hostile input', () => {
    const result = service.screenBundle('while (true) {}', 200);

    expect(result.compiled).toBe(false);
    expect(result.readyFlag).toBe(false);
    expect(result.error).toBeDefined();
  });
});
