import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimConfirmRequestDto {
  @ApiProperty({ description: 'Claim token from the bootstrap claim URL', example: 'abc123' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
