import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RegistryPluginDetail, RegistryPluginMeta, RegistryPluginVersion } from '../interfaces/registry-types';

@Injectable()
export class RegistryClient {
  readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('registry.url');

    if (!url) {
      throw new Error('Missing registry.url configuration');
    }

    this.baseUrl = url;
  }

  async getCatalog(): Promise<RegistryPluginMeta[]> {
    const res = await this.fetch(`/api/v1/plugins`);

    return res.json() as Promise<RegistryPluginMeta[]>;
  }

  async getPlugin(pluginId: string): Promise<RegistryPluginDetail> {
    const res = await this.fetch(`/api/v1/plugins/${encodeURIComponent(pluginId)}`);

    return res.json() as Promise<RegistryPluginDetail>;
  }

  async getPluginVersions(pluginId: string): Promise<RegistryPluginVersion[]> {
    const res = await this.fetch(`/api/v1/plugins/${encodeURIComponent(pluginId)}/versions`);

    return res.json() as Promise<RegistryPluginVersion[]>;
  }

  async downloadPluginZip(pluginId: string, version: string): Promise<Buffer> {
    const res = await this.fetch(
      `/api/v1/plugins/${encodeURIComponent(pluginId)}/versions/${encodeURIComponent(version)}/download`
    );

    const arrayBuffer = await res.arrayBuffer();

    return Buffer.from(arrayBuffer);
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
