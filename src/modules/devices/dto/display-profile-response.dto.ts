import { ApiProperty } from '@nestjs/swagger';

export class DisplayProfilePigmentDto {
  @ApiProperty({ description: 'Pigment color role name', example: 'red' })
  name!: string;

  @ApiProperty({ description: 'Presentation hex code used in web UI', example: '#FF0000' })
  hex!: string;

  @ApiProperty({ description: 'Calibrated reflectance hex code measured by spectrophotometer', example: '#871300' })
  calibratedHex!: string;

  @ApiProperty({ description: 'Hardware driver palette index / nibble (0-15)', example: 4 })
  nibble!: number;
}

export class DisplayProfilePresetDto {
  @ApiProperty({ description: 'Preset identifier', example: '3color' })
  id!: string;

  @ApiProperty({ description: 'Human-readable preset title', example: '3-color Contrast' })
  name!: string;

  @ApiProperty({
    description: 'Detailed description of the preset',
    example: 'High contrast Black, White, and Red highlights',
  })
  description!: string;

  @ApiProperty({
    description: 'Array of hex colors included in this preset',
    example: ['#000000', '#FFFFFF', '#FF0000'],
  })
  palette!: string[];
}

export class DisplayProfileResponseDto {
  @ApiProperty({ description: 'Unique display profile identifier', example: 'spectra6_7in3' })
  id!: string;

  @ApiProperty({
    description: 'Human-readable display panel name and resolution',
    example: 'Seeed 7.3" Spectra™ 6 (800 × 480, 6 Colors)',
  })
  name!: string;

  @ApiProperty({ description: 'Native horizontal resolution in pixels', example: 800 })
  defaultWidth!: number;

  @ApiProperty({ description: 'Native vertical resolution in pixels', example: 480 })
  defaultHeight!: number;

  @ApiProperty({ description: 'Whether this profile allows custom arbitrary resolutions', example: false })
  isCustom!: boolean;

  @ApiProperty({ description: 'Color bit depth per pixel (bits per pixel)', example: 4 })
  bpp!: number;

  @ApiProperty({
    description: 'Map of color names to hardware nibble indices expected by GxEPD firmware',
    example: { black: 0, white: 1, green: 2, blue: 3, red: 4, yellow: 5 },
  })
  hardwareNibbleMap!: Record<string, number>;

  @ApiProperty({
    description: 'Physical pigments and their reflectance calibrations',
    type: [DisplayProfilePigmentDto],
  })
  physicalPigments!: DisplayProfilePigmentDto[];

  @ApiProperty({
    description: 'Supported palette presets available for this physical display model',
    type: [DisplayProfilePresetDto],
  })
  presets!: DisplayProfilePresetDto[];

  @ApiProperty({
    description: 'Default epdoptimize processing options',
    example: { processingPreset: 'vivid', colorMatching: 'lab' },
  })
  defaultEpdConfig!: Record<string, unknown>;

  @ApiProperty({
    description: 'Formatted nibble string for diagnostic response header',
    example: '0:black, 1:white, 2:green, 3:blue, 4:red, 5:yellow',
  })
  nibbleHeaderString!: string;
}
