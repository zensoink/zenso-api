import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PluginInstanceResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  pluginId!: number;

  @ApiPropertyOptional()
  pluginVersionId?: number | null;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  configJson?: Record<string, unknown>;

  @ApiProperty()
  executionMode!: string;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  userId!: number;

  @ApiPropertyOptional()
  plugin?: Record<string, unknown>;

  @ApiPropertyOptional()
  pluginVersion?: Record<string, unknown>;
}
