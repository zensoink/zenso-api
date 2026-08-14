import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PluginValidatorService } from './plugin-validator.service';

const MAX_JAVASCRIPT_BYTES = 2 * 1024 * 1024;

function manifestWith(capabilities?: string[]): string {
  return JSON.stringify({
    id: 'zenso/test',
    version: '1.0.0',
    name: 'Test Plugin',
    schema_version: 1,
    core_min: '0.0.0',
    config_schema: {},
    ...(capabilities ? { capabilities } : {}),
  });
}

describe('PluginValidatorService', () => {
  let service: PluginValidatorService;
  let tempDir: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PluginValidatorService],
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
      await fs.writeFile(path.join(tempDir, name), content);
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
});
