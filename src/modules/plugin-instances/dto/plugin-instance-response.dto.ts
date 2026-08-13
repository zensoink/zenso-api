import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PluginInstanceResponseDto {
  @ApiProperty({ description: 'Unique instance ID', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Installed plugin ID', example: 1 })
  pluginId!: number;

  @ApiPropertyOptional({ description: 'Specific plugin version ID', example: 1, nullable: true })
  pluginVersionId?: number | null;

  @ApiProperty({ description: 'Instance name', example: 'Kitchen Weather' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Plugin configuration as JSON object',
    example: { city: 'Berlin', units: 'metric' },
  })
  configJson?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Plugin configuration schema (drives the panel config form)',
    nullable: true,
  })
  configSchema?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Execution mode', example: 'client' })
  executionMode!: string;

  @ApiProperty({ description: 'Whether the instance is active', example: true })
  isEnabled!: boolean;

  @ApiProperty({ description: 'Creation timestamp', example: '2026-07-14T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2026-07-14T10:30:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Owning user ID', example: 1 })
  userId!: number;

  @ApiPropertyOptional({ description: 'Resolved plugin object' })
  plugin?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Resolved plugin version object' })
  pluginVersion?: Record<string, unknown>;
}
