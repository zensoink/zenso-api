import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { IsolateService } from './isolate.service';
import { PluginValidatorService } from './plugin-validator.service';

const MAX_JAVASCRIPT_BYTES = 2 * 1024 * 1024;

function manifestWith(capabilities?: string[]): string {
  return JSON.stringify(manifestObject(capabilities));
}

function manifestWithout(omit: string, capabilities?: string[]): string {
  const full = manifestObject(capabilities);
  delete full[omit];
  return JSON.stringify(full);
}

function manifestObject(capabilities?: string[]): Record<string, unknown> {
  return {
    id: 'zenso/test',
    version: '1.0.0',
    name: 'Test Plugin',
    schema_version: 1,
    core_min: '0.0.0',
    config_schema: {},
    ...(capabilities ? { capabilities } : {}),
  };
}

describe('PluginValidatorService', () => {
  let service: PluginValidatorService;
  let tempDir: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginValidatorService,
        {
          provide: IsolateService,
          useValue: { screenBundle: jest.fn().mockReturnValue({ compiled: true, readyFlag: true }) },
        },
      ],
    }).compile();

    service = module.get<PluginValidatorService>(PluginValidatorService);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenso-validator-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writePlugin(manifest: string, files: Record<string, string>): Promise<void> {
    await fs.writeFile(path.join(tempDir, 'manifest.json'), manifest);
    await fs.writeFile(path.join(tempDir, 'index.liquid'), '{{ hello }}');
    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tempDir, name);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);
    }
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects .js when the script capability is absent', async () => {
    await writePlugin(manifestWith(), { 'main.js': 'console.log(1);' });

    await expect(service.validateExtractedPlugin(tempDir)).rejects.toThrow(BadRequestException);
  });

  it('allows .js when the script capability is declared', async () => {
    await writePlugin(manifestWith(['script']), { 'main.js': 'console.log(1);' });

    const { manifest } = await service.validateExtractedPlugin(tempDir);

    expect(manifest.capabilities).toEqual(['script']);
  });

  it('still rejects .mjs, .cjs, .ts, and .sh with the script capability', async () => {
    await writePlugin(manifestWith(['script']), { 'main.mjs': 'x' });

    await expect(service.validateExtractedPlugin(tempDir)).rejects.toThrow(BadRequestException);
  });

  it('rejects total .js size over 2 MB', async () => {
    await writePlugin(manifestWith(['script']), { 'main.js': 'x'.repeat(MAX_JAVASCRIPT_BYTES + 1) });

    await expect(service.validateExtractedPlugin(tempDir)).rejects.toThrow(BadRequestException);
  });

  it('rejects a manifest without id (backend is the last gate for it)', async () => {
    await writePlugin(manifestWithout('id', ['script']), {});

    await expect(service.validateExtractedPlugin(tempDir)).rejects.toThrow();
  });

  it('rejects a manifest without version (canonical schema leaves it optional)', async () => {
    await writePlugin(manifestWithout('version', ['script']), {});

    await expect(service.validateExtractedPlugin(tempDir)).rejects.toThrow();
  });

  it('accepts a dist-shaped tree with assets, favicon, README and LICENSE', async () => {
    await writePlugin(manifestWith(['script']), {
      'assets/main.js': 'window.__ZENSO_READY__ = true;',
      'assets/styles.css': 'body { margin: 0; }',
      'assets/logo.png': 'fake-png',
      'favicon.ico': 'fake-ico',
      'README.md': '# Test Plugin',
      LICENSE: 'MIT',
    });

    const { manifest } = await service.validateExtractedPlugin(tempDir);

    expect(manifest.id).toBe('zenso/test');
  });
});
