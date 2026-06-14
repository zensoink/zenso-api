import { IsNotEmpty, IsString } from 'class-validator';

export class DeviceLoginDto {
  @IsString()
  @IsNotEmpty()
  hardware_id!: string;

  @IsString()
  @IsNotEmpty()
  secret!: string;
}
