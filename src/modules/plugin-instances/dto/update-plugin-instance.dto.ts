import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdatePluginInstanceDTO {
  @ApiPropertyOptional({ description: 'Human-readable instance name', example: 'Kitchen Weather v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Plugin-specific configuration as JSON object',
    example: { city: 'Berlin', units: 'metric' },
  })
  @IsOptional()
  configJson?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Execution mode override', example: 'server' })
  @IsOptional()
  @IsString()
  executionMode?: string;

  @ApiPropertyOptional({ description: 'Whether the instance is active', example: false })
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Plugin version ID to switch to', example: 2, nullable: true })
  @IsOptional()
  @IsInt()
  pluginVersionId?: number | null;
}
