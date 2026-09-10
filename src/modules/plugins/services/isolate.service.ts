import { Injectable } from '@nestjs/common';
import ivm from 'isolated-vm';

const MEMORY_LIMIT_MB = 32;
export const ISOLATE_DEFAULT_TIMEOUT_MS = 2000;

// Minimal DOM stub so plugin bundles touching document/window at load can be
// smoke-run without a browser. Deliberately tiny: anything beyond it fails and
// the caller treats that as warn-only signal, never a render blocker.
const DOM_STUB_PRELUDE = `
function __zensoEl() {
  return { setAttribute() {}, appendChild() {}, textContent: '', dateTime: '', dataset: {} };
}
function HTMLTimeElement() {}
function SVGGElement() {}
globalThis.document = {
  addEventListener(type, fn) { if (type === 'DOMContentLoaded') fn(); },
  getElementById: __zensoEl,
  createElementNS: __zensoEl,
};
globalThis.window = globalThis;
`;

export interface ScreenResult {
  compiled: boolean;
  readyFlag: boolean;
  error?: string;
}

@Injectable()
export class IsolateService {
  // ponytail: one isolate per call, no pool — screening is import-time and rare.
  // Pool isolates here if per-render server-side eval ever lands on this service.
  withIsolate<T>(fn: (isolate: ivm.Isolate) => T): T {
    const isolate = new ivm.Isolate({ memoryLimit: MEMORY_LIMIT_MB });
    try {
      return fn(isolate);
    } finally {
      isolate.dispose();
    }
  }

  compile(source: string): void {
    this.withIsolate(isolate => {
      isolate.compileScriptSync(source);
    });
  }

  runUntrusted(source: string, timeoutMs = ISOLATE_DEFAULT_TIMEOUT_MS): unknown {
    return this.withIsolate(isolate => {
      const context = isolate.createContextSync();
      const jail = context.global;
      jail.setSync('global', jail.derefInto());
      const script = isolate.compileScriptSync(source);
      const completion: unknown = script.runSync(context, { timeout: timeoutMs });
      return completion;
    });
  }

  // Warn-first behavioural screen for a plugin bundle: syntax gate + smoke run
  // against the DOM stub, reporting whether __ZENSO_READY__ got set. Never throws.
  screenBundle(source: string, timeoutMs = ISOLATE_DEFAULT_TIMEOUT_MS): ScreenResult {
    try {
      const completion: unknown = this.withIsolate(isolate => {
        const context = isolate.createContextSync();
        const jail = context.global;
        jail.setSync('global', jail.derefInto());
        isolate.compileScriptSync(DOM_STUB_PRELUDE).runSync(context, { timeout: timeoutMs });
        const script = isolate.compileScriptSync(`${source}\n;globalThis.__ZENSO_READY__;`);
        const result: unknown = script.runSync(context, { timeout: timeoutMs });
        return result;
      });
      return { compiled: true, readyFlag: completion === true };
    } catch (error: unknown) {
      return { compiled: false, readyFlag: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
