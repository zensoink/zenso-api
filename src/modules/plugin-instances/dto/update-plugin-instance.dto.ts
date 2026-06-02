export class UpdatePluginInstanceDTO {
  name?: string;
  configJson?: Record<string, unknown>;
  executionMode?: string;
  isEnabled?: boolean;
  pluginVersionId?: number | null;
}
