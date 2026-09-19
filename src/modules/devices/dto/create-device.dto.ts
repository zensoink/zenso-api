import { VALID_DISPLAY_PROFILE_IDS, VALID_PRESET_IDS } from '@modules/render';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
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
  @Min(100)
  @Max(4000)
  width?: number;

  @ApiPropertyOptional({ description: 'Display height in pixels', example: 480 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(4000)
  height?: number;

  @ApiPropertyOptional({
    description: 'Color palette as hex strings (minimum 2 colors, maximum 7 colors)',
    example: ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^#[0-9A-Fa-f]{6}$/, { each: true, message: 'Each palette item must be a valid 6-char hex color' })
  @ArrayMinSize(2)
  @ArrayMaxSize(7)
  @ArrayUnique({ message: 'Palette colors must be unique' })
  palette?: string[];

  @ApiPropertyOptional({
    description: 'Display profile identifier',
    enum: VALID_DISPLAY_PROFILE_IDS,
    example: 'spectra6_7in3',
  })
  @IsOptional()
  @IsString()
  @IsIn(VALID_DISPLAY_PROFILE_IDS)
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
    enum: VALID_PRESET_IDS,
    example: 'full',
  })
  @IsOptional()
  @IsIn(VALID_PRESET_IDS)
  palettePreset?: string;
}
