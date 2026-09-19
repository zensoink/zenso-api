import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceStatus } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdateDeviceDto {
  @ApiPropertyOptional({ description: 'Human-readable device name', example: 'Living Room Display' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Hardware display width in pixels', example: 800 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(4000)
  width?: number;

  @ApiPropertyOptional({ description: 'Hardware display height in pixels', example: 480 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(4000)
  height?: number;

  @ApiPropertyOptional({
    description: 'Color palette hex values',
    example: ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^#[0-9A-Fa-f]{6}$/, { each: true, message: 'Each palette item must be a valid 6-char hex color' })
  @ArrayMinSize(2)
  palette?: string[];

  @ApiPropertyOptional({ description: 'Display profile identifier', example: 'spectra6_7in3' })
  @IsOptional()
  @IsString()
  displayProfile?: string;

  @ApiPropertyOptional({
    description: 'EPD dithering and tone mapping configuration',
    example: { colorMatching: 'lab', ditheringType: 'errorDiffusion' },
  })
  @IsOptional()
  @IsObject()
  epdConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Sleep cadence / polling interval in seconds', example: 300 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(86400)
  refreshRate?: number;

  @ApiPropertyOptional({ description: 'Display orientation in degrees', enum: [0, 90, 180, 270], example: 0 })
  @IsOptional()
  @IsIn([0, 90, 180, 270])
  rotation?: number;

  @ApiPropertyOptional({
    description: 'Palette preset mode',
    enum: ['full', '3color', 'mono', 'custom'],
    example: 'full',
  })
  @IsOptional()
  @IsIn(['full', '3color', 'mono', 'custom'])
  palettePreset?: string;

  @ApiPropertyOptional({ description: 'Device operational status', enum: DeviceStatus, example: DeviceStatus.active })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;
}
