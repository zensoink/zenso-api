export interface RegistryPluginMeta {
  id: string;
  name: string;
  description?: string;
  author?: { name: string; url?: string };
  thumbnail?: string;
  executionMode: 'local' | 'protected';
  latestVersion: string;
  distTags: RegistryDistTags;
}

export interface RegistryPluginDetail {
  id: string;
  name: string;
  description?: string;
  author?: { name: string; url?: string };
  thumbnail?: string;
  executionMode: 'local' | 'protected';
  schema_version: number;
  config_schema?: unknown;
  core_min?: string;
  license?: string;
  distTags: RegistryDistTags;
  versions: RegistryPluginVersion[];
}

export interface RegistryPluginVersion {
  version: string;
  createdAt: string;
  checksumSha256?: string;
}

export interface RegistryDistTags {
  latest?: string;
  beta?: string;
  next?: string;
  [key: string]: string | undefined;
}
