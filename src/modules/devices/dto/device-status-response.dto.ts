import { ApiProperty } from '@nestjs/swagger';

export class DeviceStatusResponseDto {
  @ApiProperty({ description: 'Device hardware identifier', example: 'e4:5f:01:23:45:67' })
  hardwareId!: string;

  @ApiProperty({ description: 'Active screen ID (null if none)', example: 1, nullable: true })
  screenId!: number | null;

  @ApiProperty({
    description: 'URL to fetch the rendered display',
    example: 'https://api.zenso.local/devices/display?format=raw',
    nullable: true,
  })
  imageUrl!: string | null;

  @ApiProperty({ description: 'Polling interval in seconds', example: 300 })
  refreshRate!: number;

  @ApiProperty({ description: 'Screen render width in pixels', example: 800 })
  width!: number;

  @ApiProperty({ description: 'Screen render height in pixels', example: 480 })
  height!: number;

  @ApiProperty({
    description: 'Active color palette hex strings',
    example: ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00'],
  })
  palette!: string[];

  @ApiProperty({ description: 'Display profile identifier', example: 'spectra6_7in3' })
  displayProfile!: string;

  @ApiProperty({ description: 'Display orientation in degrees', enum: [0, 90, 180, 270], example: 0 })
  rotation!: number;

  @ApiProperty({ description: 'Current render mode', example: 'ui' })
  renderMode!: string;

  @ApiProperty({ description: 'Whether a rendered image exists', example: true })
  hasImage!: boolean;

  @ApiProperty({ description: 'Whether content changed since last check-in', example: false })
  contentChanged!: boolean;
}
