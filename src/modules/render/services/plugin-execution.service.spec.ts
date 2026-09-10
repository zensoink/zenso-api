import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { PrismaService } from '@core/prisma';
import { DataSourcesService } from '@modules/data-sources';
import { PluginStorageService } from '@modules/plugins';

import { ContextAggregationService } from './context-aggregation.service';
import { PluginExecutionService } from './plugin-execution.service';

describe('PluginExecutionService', () => {
  let service: PluginExecutionService;
  let tmpDir: string;
  let mockPrismaService: {
    pluginInstance: { findUnique: jest.Mock };
    pluginVersion: { findFirst: jest.Mock };
  };
  let mockDataSourcesService: { resolveAll: jest.Mock };
  let mockContextAggregationService: { buildContext: jest.Mock };

  const makeManifest = (overrides: Record<string, unknown> = {}) => ({
    $schema: 'https://zenso.dev/manifest.schema.json',
    id: 'test/calendar',
    version: '1.0.0',
    name: 'Calendar',
    schema_version: 1,
    core_min: '0.1.0',
    config_schema: { type: 'object', properties: {} },
    ...overrides,
  });

  const baseInstance = {
    id: 5,
    isEnabled: true,
    pluginVersionId: null,
    configJson: { color: 'red' },
    pluginId: 1,
    plugin: { id: 1, slug: 'test.calendar', name: 'Calendar' },
  };

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-exec-'));

    mockPrismaService = {
      pluginInstance: { findUnique: jest.fn().mockResolvedValue(baseInstance) },
      pluginVersion: {
        findFirst: jest.fn().mockResolvedValue({ id: 9, installPath: tmpDir, version: '1.0.0', manifestJson: null }),
      },
    };
    mockDataSourcesService = {
      resolveAll: jest.fn().mockResolvedValue({ cal: { events: [{ title: 'Sync' }] } }),
    };
    mockContextAggregationService = {
      buildContext: jest.fn().mockResolvedValue({
        zenso: { user: { time_zone_iana: 'Europe/Warsaw' } },
        config: { color: 'red' },
      }),
    };

    service = new PluginExecutionService(
      mockPrismaService as unknown as PrismaService,
      { readManifest: jest.fn().mockResolvedValue(undefined) } as unknown as PluginStorageService,
      mockContextAggregationService as unknown as ContextAggregationService,
      mockDataSourcesService as unknown as DataSourcesService
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function executeWithTemplate(template: string, manifestJson: Record<string, unknown>): Promise<string> {
    mockPrismaService.pluginVersion.findFirst.mockResolvedValue({
      id: 9,
      installPath: tmpDir,
      version: '1.0.0',
      manifestJson,
    });
    await fs.writeFile(path.join(tmpDir, 'index.liquid'), template);
    const { html } = await service.execute({
      screenId: 1,
      pluginInstanceId: 5,
      width: 800,
      height: 480,
    });
    return html;
  }

  it('resolves declared data_sources under the data scope only', async () => {
    const manifestJson = makeManifest({
      data_sources: [{ id: 'cal', type: 'ics', config: { urls_field: 'calendar_url' } }],
    });

    const html = await executeWithTemplate('{{ data.cal.events.first.title }}', manifestJson);

    expect(html).toBe('Sync');
    expect(mockDataSourcesService.resolveAll).toHaveBeenCalledWith(
      [{ id: 'cal', type: 'ics', config: { urls_field: 'calendar_url' } }],
      { color: 'red' },
      'Europe/Warsaw',
      5,
      undefined
    );
    await expect(executeWithTemplate('{{ cal.events.first.title }}', manifestJson)).resolves.toBe('');
  });

  it('passes an empty data_sources list when the manifest declares none', async () => {
    const html = await executeWithTemplate('{{ nosuchkey }}', makeManifest());

    expect(html).toBe('');
    expect(mockDataSourcesService.resolveAll).toHaveBeenCalledWith([], { color: 'red' }, 'Europe/Warsaw', 5, undefined);
  });

  it('registers the json_safe filter to escape HTML injection', async () => {
    const html = await executeWithTemplate('{{ "<b>x</b>" | json_safe }}', makeManifest());

    expect(html).toBe('"\\u003cb>x\\u003c/b>"');
  });
});
