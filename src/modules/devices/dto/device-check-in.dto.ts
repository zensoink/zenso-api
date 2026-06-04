import { IsOptional, IsString } from 'class-validator';

export class DeviceCheckInDto {
  @IsOptional()
  @IsString()
  firmwareVersion?: string;
}
