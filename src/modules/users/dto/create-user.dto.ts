import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDTO {
  @ApiPropertyOptional({ description: 'Display name for the user', example: 'Alice' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'User email address (used as login)', example: 'alice@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'User password, minimum 8 characters', example: 'secureP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ description: 'IANA timezone for rendering user screens', example: 'Europe/Warsaw' })
  @IsString()
  @IsOptional()
  timeZoneIana?: string;
}
