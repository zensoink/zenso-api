import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdatePluginInstanceDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  configJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  executionMode?: string;

  @IsOptional()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  pluginVersionId?: number | null;
}
