import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeviceLoginDto {
  @ApiProperty({ description: 'Unique hardware identifier (e.g., MAC or serial)', example: 'e4:5f:01:23:45:67' })
  @IsString()
  @IsNotEmpty()
  hardware_id!: string;

  @ApiProperty({ description: 'Device secret obtained during bootstrap/claim', example: 'd5f8a2b1c3e4...' })
  @IsString()
  @IsNotEmpty()
  secret!: string;
}
