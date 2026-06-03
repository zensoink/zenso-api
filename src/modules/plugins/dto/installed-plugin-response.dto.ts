import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstalledPluginResponseDto {
  @ApiProperty()
  pluginId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  authorName?: string | null;

  @ApiProperty()
  executionMode!: string;

  @ApiPropertyOptional()
  selectedVersion?: string | null;

  @ApiProperty()
  installedVersions!: string[];

  @ApiProperty()
  status!: string;
}
