import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstalledPluginResponseDto {
  @ApiProperty({ description: 'Internal plugin ID (used for uninstall)', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Registry plugin identifier', example: 'weather-widget' })
  pluginId!: string;

  @ApiProperty({ description: 'Unique URL slug', example: 'weather-widget' })
  slug!: string;

  @ApiProperty({ description: 'Display name', example: 'Weather Widget' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Plugin description',
    example: 'Displays current weather and forecast',
    nullable: true,
  })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Plugin author', example: 'Zenso Labs', nullable: true })
  authorName?: string | null;

  @ApiProperty({ description: 'Execution mode', example: 'client' })
  executionMode!: string;

  @ApiPropertyOptional({ description: 'Currently active version', example: '1.0.0', nullable: true })
  selectedVersion?: string | null;

  @ApiProperty({ description: 'All installed versions', example: ['1.0.0', '0.9.0'] })
  installedVersions!: string[];

  @ApiProperty({ description: 'Installation status', example: 'installed' })
  status!: string;
}
