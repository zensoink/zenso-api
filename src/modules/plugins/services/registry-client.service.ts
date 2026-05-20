import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AdmZip from 'adm-zip';

import { RegistryPluginDetail, RegistryPluginMeta, RegistryPluginVersion } from '../interfaces/registry-types';

@Injectable()
export class RegistryClient {
  readonly baseUrl: string;
  private readonly _mockEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('registry.url');

    if (!url) {
      throw new Error('Missing registry.url configuration');
    }

    this.baseUrl = url;
    this._mockEnabled = this.configService.get<boolean>('registry.mockEnabled') ?? false;
  }

  async getCatalog(): Promise<RegistryPluginMeta[]> {
    if (this._mockEnabled) {
      return this.mockCatalog();
    }

    const res = await this.fetch(`/api/v1/plugins`);

    return res.json() as Promise<RegistryPluginMeta[]>;
  }

  async getPlugin(pluginId: string): Promise<RegistryPluginDetail> {
    if (this._mockEnabled) {
      return this.mockPluginDetail(pluginId);
    }

    const res = await this.fetch(`/api/v1/plugins/${encodeURIComponent(pluginId)}`);

    return res.json() as Promise<RegistryPluginDetail>;
  }

  async getPluginVersions(pluginId: string): Promise<RegistryPluginVersion[]> {
    if (this._mockEnabled) {
      return this.mockPluginVersions();
    }

    const res = await this.fetch(`/api/v1/plugins/${encodeURIComponent(pluginId)}/versions`);

    return res.json() as Promise<RegistryPluginVersion[]>;
  }

  async downloadPluginZip(pluginId: string, version: string): Promise<Buffer> {
    if (this._mockEnabled) {
      return this.mockPluginZip(pluginId, version);
    }

    const res = await this.fetch(
      `/api/v1/plugins/${encodeURIComponent(pluginId)}/versions/${encodeURIComponent(version)}/download`
    );

    const arrayBuffer = await res.arrayBuffer();

    return Buffer.from(arrayBuffer);
  }

  private mockCatalog(): RegistryPluginMeta[] {
    return [
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
    ];
  }

  private mockPluginDetail(pluginId: string): RegistryPluginDetail {
    const versions = this.mockPluginVersions();

    return {
      id: pluginId,
      name: pluginId.split('/').pop() ?? pluginId,
      description: `Mock plugin: ${pluginId}`,
      author: { name: 'Zenso' },
      executionMode: pluginId.includes('weather') ? 'protected' : 'local',
      schema_version: 1,
      core_min: '1.0.0',
      distTags: { latest: '1.0.0' },
      versions,
    };
  }

  private mockPluginVersions(): RegistryPluginVersion[] {
    return [
      { version: '1.0.0', createdAt: '2025-01-01T00:00:00Z' },
      { version: '0.9.0', createdAt: '2024-12-01T00:00:00Z' },
    ];
  }

  private mockPluginZip(pluginId: string, version: string): Buffer {
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
    zip.addFile('src/index.liquid', Buffer.from('Hello {{ name | default: "World" }}'));

    return Buffer.from(zip.toBuffer());
  }

  private async fetch(path: string): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    let res: Response;

    try {
      res = await fetch(url);
    } catch {
      throw new ServiceUnavailableException(`Registry is unreachable: ${url}. Is REGISTRY_URL configured correctly?`);
    }

    if (res.status === 404) {
      throw new NotFoundException(`Registry resource not found: ${path}`);
    }

    if (!res.ok) {
      throw new ServiceUnavailableException(`Registry returned ${res.status} for ${path}`);
    }

    return res;
  }
}
