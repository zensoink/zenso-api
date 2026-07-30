import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BootstrapClaimStatus } from '@prisma/client';

export class ClaimStatusResponseDto {
  @ApiProperty({ description: 'Current claim session status', enum: BootstrapClaimStatus, example: 'pending' })
  status!: BootstrapClaimStatus;

  @ApiPropertyOptional({ description: 'Hardware ID (present when claimed)', example: 'e4:5f:01:23:45:67' })
  hardware_id?: string;

  @ApiPropertyOptional({ description: 'Device secret (present when claimed)', example: 'd5f8a2b1c3e4...' })
  device_secret?: string;
}
