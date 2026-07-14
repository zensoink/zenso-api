import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InstallFromRegistryDTO {
  @ApiProperty({ description: 'Plugin identifier from the registry', example: 'weather-widget' })
  @IsString()
  @IsNotEmpty()
  pluginId!: string;

  @ApiPropertyOptional({ description: 'Specific version to install (defaults to latest)', example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;
}
