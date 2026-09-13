import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({
    description: 'Canonical hardware identifier (12 uppercase hex chars, MAC without separators)',
    example: 'E45F01234567',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9A-F]{12}$/, {
    message: 'hardware_id must be the canonical 12-char uppercase MAC without separators (e.g. E45F01234567)',
  })
  hardware_id!: string;

  @ApiProperty({ description: 'Human-readable device name', example: 'Living Room Display' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Display width in pixels', example: 800 })
  @IsOptional()
  @IsInt()
  width?: number;

  @ApiPropertyOptional({ description: 'Display height in pixels', example: 480 })
  @IsOptional()
  @IsInt()
  height?: number;

  @ApiPropertyOptional({ description: 'Color palette as hex strings', example: ['#000000', '#FFFFFF'] })
  @IsOptional()
  @IsArray()
  palette?: string[];
}
