import { Injectable } from '@nestjs/common';
import AdmZip from 'adm-zip';

import { RegistryPluginDetail, RegistryPluginMeta, RegistryPluginVersion } from '../interfaces/registry-types';

const MOCK_VERSIONS: RegistryPluginVersion[] = [
  { version: '1.0.0', createdAt: '2025-01-01T00:00:00Z' },
  { version: '0.9.0', createdAt: '2024-12-01T00:00:00Z' },
];

@Injectable()
export class MockRegistryClient {
  readonly baseUrl = 'http://mock-registry.local';

  getCatalog(): Promise<RegistryPluginMeta[]> {
    return Promise.resolve([
      {
        id: 'zenso/hello-world',
        name: 'Hello World',
        description: 'A sample plugin for testing',
        author: { name: 'Zenso', url: 'https://zenso.dev' },
        executionMode: 'local',
        latestVersion: '1.0.0',
        distTags: { latest: '1.0.0' },
      },
      {
        id: 'zenso/weather',
        name: 'Weather Display',
        description: 'Shows current weather on your e-ink display',
        author: { name: 'Zenso' },
        executionMode: 'protected',
        latestVersion: '2.1.0',
        distTags: { latest: '2.1.0' },
      },
    ]);
  }

  getPlugin(pluginId: string): Promise<RegistryPluginDetail> {
    return Promise.resolve({
      id: pluginId,
      name: pluginId.split('/').pop() ?? pluginId,
      description: `Mock plugin: ${pluginId}`,
      author: { name: 'Zenso' },
      executionMode: pluginId.includes('weather') ? 'protected' : 'local',
      schema_version: 1,
      core_min: '1.0.0',
      distTags: { latest: '1.0.0' },
      versions: MOCK_VERSIONS,
    });
  }

  getPluginVersions(): Promise<RegistryPluginVersion[]> {
    return Promise.resolve(MOCK_VERSIONS);
  }

  downloadPluginZip(pluginId: string, version: string): Promise<Buffer> {
    const manifest = {
      id: pluginId,
      version,
      name: pluginId.split('/').pop() ?? pluginId,
      schema_version: 1,
      core_min: '1.0.0',
      config_schema: {},
    };

    const zip = new AdmZip();
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));
    zip.addFile('index.liquid', Buffer.from('Hello {{ name | default: "World" }}'));

    return Promise.resolve(Buffer.from(zip.toBuffer()));
  }
}
