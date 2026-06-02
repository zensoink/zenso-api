import { IsNotEmpty, IsString } from 'class-validator';

export class DeviceLoginDto {
  @IsString()
  @IsNotEmpty()
  uid!: string;

  @IsString()
  @IsNotEmpty()
  secret!: string;
}
