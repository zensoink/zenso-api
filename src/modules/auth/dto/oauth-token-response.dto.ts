import { ApiProperty } from '@nestjs/swagger';

export class OAuthTokenResponseDto {
  @ApiProperty({
    description: 'JWT bearer access token for authorizing subsequent requests',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWxpY2VAZXhhbXBsZS5jb20iLCJ0eXBlIjoidXNlciJ9...',
  })
  access_token!: string;

  @ApiProperty({
    description: 'Token type, always bearer',
    example: 'bearer',
  })
  token_type!: string;

  @ApiProperty({
    description: 'Access token expiration lifetime in seconds',
    example: 3600,
  })
  expires_in!: number;
}
