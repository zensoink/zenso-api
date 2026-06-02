import { PrismaModule } from '@core/prisma';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DeviceJwtAuthGuard } from './guards/device-jwt-auth.guard';
import { UserJwtAuthGuard } from './guards/user-jwt-auth.guard';
import { DeviceJwtStrategy } from './strategies/device-jwt.strategy';
import { UserJwtStrategy } from './strategies/user-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      // Secrets are intentionally NOT set here.
      // This module signs two token types (user, device) with different secrets.
      // Secret and expiresIn are passed explicitly in AuthService per token type.
      signOptions: { algorithm: 'HS256' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserJwtStrategy, DeviceJwtStrategy, UserJwtAuthGuard, DeviceJwtAuthGuard],
  exports: [UserJwtAuthGuard, DeviceJwtAuthGuard],
})
export class AuthModule {}
