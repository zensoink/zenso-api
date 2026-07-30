import { AuthModule } from '@modules/auth';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ClaimController } from './claim.controller';
import { ClaimService } from './claim.service';

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [ClaimController],
  providers: [ClaimService],
})
export class ClaimModule {}
