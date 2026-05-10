export interface PluginManifestAuthor {
  name: string;
  url?: string;
}

export interface PluginManifest {
  $schema?: string;
  id: string;
  version: string;
  name: string;
  thumbnail?: string;
  description?: string;
  schema_version: number;
  core_min: string;
  license?: string;
  author?: PluginManifestAuthor;
  config_schema: Record<string, unknown>;
}
