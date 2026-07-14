import { ApiProperty } from '@nestjs/swagger';

import { DeviceResponseDto } from './device-response.dto';

export class CreateDeviceResponseDto {
  @ApiProperty({ type: DeviceResponseDto, description: 'Created device record' })
  device!: DeviceResponseDto;

  @ApiProperty({
    description: 'Raw device secret — shown only once, store securely',
    example: 'd5f8a2b1c3e4f5a6b7c8d9e0f1a2b3c4',
  })
  rawSecret!: string;
}
