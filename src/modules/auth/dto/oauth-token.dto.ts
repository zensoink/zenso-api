import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OAuthTokenDto {
  @ApiProperty({
    description: 'User email address provided as username in OAuth2 password grant',
    example: 'alice@example.com',
  })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    description: 'User account password',
    example: 'StrongPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({
    description: 'OAuth2 grant type, defaults to password',
    example: 'password',
  })
  @IsString()
  @IsOptional()
  grant_type?: string;

  @ApiPropertyOptional({
    description: 'Optional OAuth2 client identifier',
    example: 'zenso-swagger',
  })
  @IsString()
  @IsOptional()
  client_id?: string;

  @ApiPropertyOptional({
    description: 'Optional OAuth2 client secret',
    example: '',
  })
  @IsString()
  @IsOptional()
  client_secret?: string;

  @ApiPropertyOptional({
    description: 'Optional OAuth2 scope requested',
    example: '',
  })
  @IsString()
  @IsOptional()
  scope?: string;
}
