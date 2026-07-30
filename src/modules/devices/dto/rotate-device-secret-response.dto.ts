import { ApiProperty } from '@nestjs/swagger';

export class RotateDeviceSecretResponseDto {
  @ApiProperty({ description: 'Device ID', example: 1 })
  id!: number;

  @ApiProperty({ description: 'New raw device secret — shown only once', example: 'a1b2c3d4e5f6...' })
  rawSecret!: string;
}
