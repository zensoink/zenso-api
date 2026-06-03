import { ApiProperty } from '@nestjs/swagger';

import { DeviceResponseDto } from './device-response.dto';

export class CreateDeviceResponseDto {
  @ApiProperty({ type: DeviceResponseDto })
  device!: DeviceResponseDto;

  @ApiProperty()
  rawSecret!: string;
}
