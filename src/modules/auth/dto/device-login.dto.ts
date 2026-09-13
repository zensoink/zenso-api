import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class DeviceLoginDto {
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

  @ApiProperty({ description: 'Device secret obtained during bootstrap/claim', example: 'd5f8a2b1c3e4...' })
  @IsString()
  @IsNotEmpty()
  secret!: string;
}
