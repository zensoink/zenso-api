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

  @ApiProperty({ description: 'Active color palette', example: ['#000000', '#FFFFFF'] })
  palette!: string[];

  @ApiProperty({ description: 'Current render mode', example: 'black-white' })
  renderMode!: string;

  @ApiProperty({ description: 'Whether a rendered image exists', example: true })
  hasImage!: boolean;

  @ApiProperty({ description: 'Whether content changed since last check-in', example: false })
  contentChanged!: boolean;
}
