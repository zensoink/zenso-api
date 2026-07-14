import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DeviceCheckInDto {
  @ApiPropertyOptional({ description: 'Current firmware version of the device', example: '1.2.3' })
  @IsOptional()
  @IsString()
  firmwareVersion?: string;
}
