import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePluginInstanceDTO {
  @ApiProperty({ description: 'Installed plugin ID', example: 1 })
  @IsInt()
  pluginId!: number;

  @ApiPropertyOptional({ description: 'Specific plugin version ID (defaults to latest compatible)', example: 1 })
  @IsOptional()
  @IsInt()
  pluginVersionId?: number;

  @ApiProperty({ description: 'Human-readable instance name', example: 'Kitchen Weather' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Plugin-specific configuration as JSON object',
    example: { city: 'Berlin', units: 'metric' },
  })
  @IsOptional()
  configJson?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Execution mode override', example: 'client' })
  @IsOptional()
  @IsString()
  executionMode?: string;

  @ApiPropertyOptional({ description: 'Whether the instance is active', example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
