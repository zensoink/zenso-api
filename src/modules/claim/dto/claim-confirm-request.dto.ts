import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimConfirmRequestDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
