import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateScreenDTO {
  @ApiPropertyOptional({ description: 'Screen name', example: 'Kitchen Dashboard v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Layout template key', example: 'flex' })
  @IsOptional()
  @IsString()
  layoutType?: string;

  @ApiPropertyOptional({ description: 'Canvas width in pixels', example: 800 })
  @IsOptional()
  @IsInt()
  width?: number;

  @ApiPropertyOptional({ description: 'Canvas height in pixels', example: 480 })
  @IsOptional()
  @IsInt()
  height?: number;

  @ApiPropertyOptional({ description: 'Assigned device ID (null = detach)', example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  deviceId?: number | null;

  @ApiPropertyOptional({ description: 'Whether the screen is active', example: false })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Color palette hex strings', example: ['#000000', '#FFFFFF'] })
  @IsOptional()
  @IsArray()
  palette?: string[];

  @ApiPropertyOptional({ description: 'Render mode key', example: 'black-white' })
  @IsOptional()
  @IsString()
  renderMode?: string;

  @ApiPropertyOptional({ description: 'Minimum interval between renders (seconds)', example: 300 })
  @IsOptional()
  @IsInt()
  refreshRate?: number;

  @ApiPropertyOptional({
    description: 'IANA timezone for rendering (falls back to user, then server default)',
    example: 'Europe/Warsaw',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  timeZoneIana?: string | null;
}
