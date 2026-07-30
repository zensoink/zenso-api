import { ApiProperty } from '@nestjs/swagger';

export class BootstrapResponseDto {
  @ApiProperty({
    description: 'URL the device owner visits to claim the device',
    example: 'http://zenso.local/claim/abc123',
    nullable: true,
  })
  claim_url!: string | null;

  @ApiProperty({ description: 'Claim session ID for polling', example: 42, nullable: true })
  claim_session_id!: number | null;

  @ApiProperty({
    description: 'ISO 8601 expiry timestamp for the claim session',
    example: '2026-07-15T12:00:00.000Z',
    nullable: true,
  })
  claim_expires_at!: string | null;
}
