import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeviceDto {
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
