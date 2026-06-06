import type { UserJwtPayload } from '@modules/auth';
import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { ClaimService } from './claim.service';
import { ClaimConfirmRequestDto } from './dto/claim-confirm-request.dto';
import { ClaimConfirmResponseDto } from './dto/claim-confirm-response.dto';
import { ClaimInfoResponseDto } from './dto/claim-info-response.dto';

@Controller()
export class ClaimController {
  constructor(
    private readonly claimService: ClaimService,
    private readonly jwtService: JwtService
  ) {}

  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Get('claim/:token')
  async getClaimInfo(
    @Param('token') token: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ClaimInfoResponseDto | void> {
    const userId = await this.extractUserId(req);

    if (!userId) {
      res.redirect(302, `/auth/login?redirect=/claim/${token}`);
      return;
    }

    return this.claimService.getClaimInfo(token);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(UserJwtAuthGuard)
  @Post('claim/confirm')
  async confirmClaim(
    @Body() dto: ClaimConfirmRequestDto,
    @Req() req: { user: UserJwtPayload }
  ): Promise<ClaimConfirmResponseDto> {
    return this.claimService.confirmClaim(dto, req.user.sub);
  }

  private async extractUserId(req: Request): Promise<number | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;

    try {
      const jwt = authHeader.slice(7);
      const payload = await this.jwtService.verifyAsync<UserJwtPayload>(jwt);
      return payload.sub;
    } catch {
      return null;
    }
  }
}
