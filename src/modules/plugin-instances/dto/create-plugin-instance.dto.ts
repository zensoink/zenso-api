import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePluginInstanceDTO {
  @IsInt()
  pluginId!: number;

  @IsOptional()
  @IsInt()
  pluginVersionId?: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  configJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  executionMode?: string;

  @IsOptional()
  isEnabled?: boolean;

  @IsInt()
  userId!: number;
}
