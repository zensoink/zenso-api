import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  registryPluginDetailSchema,
  registryPluginMetaSchema,
  registryPluginVersionSchema,
} from '../interfaces/registry-types.schema';

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

  async getCatalog() {
    const res = await this.fetch(`/api/v1/plugins`);

    return registryPluginMetaSchema.array().parse(await res.json());
  }

  async getPlugin(pluginId: string) {
    const res = await this.fetch(`/api/v1/plugins/${encodeURIComponent(pluginId)}`);

    return registryPluginDetailSchema.parse(await res.json());
  }

  async getPluginVersions(pluginId: string) {
    const res = await this.fetch(`/api/v1/plugins/${encodeURIComponent(pluginId)}/versions`);

    return registryPluginVersionSchema.array().parse(await res.json());
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
