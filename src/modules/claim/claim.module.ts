import { AuthModule } from '@modules/auth';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { ClaimController } from './claim.controller';
import { ClaimService } from './claim.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('auth.userSecret'),
        signOptions: { algorithm: 'HS256' },
      }),
    }),
    AuthModule,
    ConfigModule,
  ],
  controllers: [ClaimController],
  providers: [ClaimService],
})
export class ClaimModule {}
