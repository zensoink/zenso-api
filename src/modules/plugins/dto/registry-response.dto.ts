import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RegistryDistTagsDto {
  @ApiPropertyOptional({ description: 'Latest version tag', example: '1.0.0' })
  latest?: string;

  @ApiPropertyOptional({ description: 'Beta version tag', example: '1.1.0-beta.1' })
  beta?: string;

  @ApiPropertyOptional({ description: 'Next version tag', example: '2.0.0-next.1' })
  next?: string;
}

class RegistryAuthorDto {
  @ApiProperty({ description: 'Author name', example: 'Zenso Labs' })
  name!: string;

  @ApiPropertyOptional({ description: 'Author URL', example: 'https://zenso.io' })
  url?: string;
}

export class RegistryPluginVersionDto {
  @ApiProperty({ description: 'Semantic version string', example: '1.0.0' })
  version!: string;

  @ApiProperty({ description: 'ISO 8601 publish timestamp', example: '2026-06-01T12:00:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({ description: 'SHA-256 checksum of the plugin archive', example: 'a1b2c3d4...' })
  checksumSha256?: string;
}

export class RegistryPluginMetaDto {
  @ApiProperty({ description: 'Plugin registry identifier', example: 'weather-widget' })
  id!: string;

  @ApiProperty({ description: 'Display name', example: 'Weather Widget' })
  name!: string;

  @ApiPropertyOptional({ description: 'Plugin description', example: 'Displays current weather and forecast' })
  description?: string;

  @ApiPropertyOptional({ description: 'Plugin author', type: RegistryAuthorDto })
  author?: RegistryAuthorDto;

  @ApiPropertyOptional({
    description: 'Thumbnail image URL',
    example: 'https://registry.zenso.io/thumbnails/weather-widget.png',
  })
  thumbnail?: string;

  @ApiProperty({ description: 'Execution mode', example: 'protected' })
  executionMode!: string;

  @ApiProperty({ description: 'Latest available version', example: '1.0.0' })
  latestVersion!: string;

  @ApiProperty({ description: 'Distribution tags', type: RegistryDistTagsDto })
  distTags!: RegistryDistTagsDto;
}

export class RegistryPluginDetailDto {
  @ApiProperty({ description: 'Plugin registry identifier', example: 'weather-widget' })
  id!: string;

  @ApiProperty({ description: 'Display name', example: 'Weather Widget' })
  name!: string;

  @ApiPropertyOptional({ description: 'Plugin description', example: 'Displays current weather and forecast' })
  description?: string;

  @ApiPropertyOptional({ description: 'Plugin author', type: RegistryAuthorDto })
  author?: RegistryAuthorDto;

  @ApiPropertyOptional({
    description: 'Thumbnail image URL',
    example: 'https://registry.zenso.io/thumbnails/weather-widget.png',
  })
  thumbnail?: string;

  @ApiProperty({ description: 'Execution mode', example: 'local' })
  executionMode!: string;

  @ApiProperty({ description: 'Schema version', example: 1 })
  schema_version!: number;

  @ApiPropertyOptional({ description: 'Minimum core version required', example: '1.0.0' })
  core_min?: string;

  @ApiPropertyOptional({ description: 'Software license', example: 'MIT' })
  license?: string;

  @ApiProperty({ description: 'Distribution tags', type: RegistryDistTagsDto })
  distTags!: RegistryDistTagsDto;

  @ApiProperty({ description: 'Available versions', type: RegistryPluginVersionDto, isArray: true })
  versions!: RegistryPluginVersionDto[];
}
