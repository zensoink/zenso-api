import { ApiProperty } from '@nestjs/swagger';

export class ClaimConfirmResponseDto {
  @ApiProperty({ description: 'Whether the claim was successful', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Hardware ID of the claimed device', example: 'e4:5f:01:23:45:67' })
  hardware_id!: string;
}
