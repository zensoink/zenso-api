export class CreatePluginInstanceDTO {
  pluginId: number;
  pluginVersionId?: number;
  name: string;
  configJson?: Record<string, unknown>;
  executionMode?: string;
  isEnabled?: boolean;
  userId: number;
}
