import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PluginIconDto {
  @ApiProperty({
    description: 'Relative icon URL; prefix with the API host',
    example: '/plugins/assets/zenso__plugin-starter/1.1.0/favicon-32x32.png',
  })
  src!: string;

  @ApiProperty({ description: 'Icon sizes descriptor ("any" for .ico)', example: '32x32' })
  sizes!: string;

  @ApiProperty({ description: 'Icon MIME type', example: 'image/png' })
  type!: string;
}

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

  @ApiPropertyOptional({
    description: 'Plugin configuration schema (drives the panel config form)',
    nullable: true,
  })
  configSchema?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description:
      'Relative thumbnail URL (manifest thumbnail resolved against the selected version); prefix with the API host',
    example: '/plugins/assets/zenso__plugin-starter/1.1.0/assets/logo.png',
    nullable: true,
  })
  thumbnailUrl?: string | null;

  @ApiProperty({
    description: 'Available plugin icons (favicon.ico + sized PNGs) for the selected version; empty when none shipped',
    type: PluginIconDto,
    isArray: true,
  })
  icons!: PluginIconDto[];

  @ApiPropertyOptional({
    description: 'Relative README.md URL for the selected version (hello page); null when the plugin ships no README',
    example: '/plugins/assets/zenso__plugin-starter/1.1.0/README.md',
    nullable: true,
  })
  readmeUrl?: string | null;

  @ApiProperty({ description: 'Execution mode', example: 'client' })
  executionMode!: string;

  @ApiPropertyOptional({ description: 'Currently active version', example: '1.0.0', nullable: true })
  selectedVersion?: string | null;

  @ApiProperty({ description: 'All installed versions', example: ['1.0.0', '0.9.0'] })
  installedVersions!: string[];

  @ApiProperty({ description: 'Installation status', example: 'installed' })
  status!: string;
}
