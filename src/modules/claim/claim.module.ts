import { AuthModule } from '@modules/auth';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ClaimController } from './claim.controller';
import { ClaimService } from './claim.service';

@Module({
  imports: [
    JwtModule.register({
      signOptions: { algorithm: 'HS256' },
    }),
    AuthModule,
  ],
  controllers: [ClaimController],
  providers: [ClaimService],
})
export class ClaimModule {}
