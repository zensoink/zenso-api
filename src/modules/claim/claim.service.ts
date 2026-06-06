import { PrismaService } from '@core/prisma';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ClaimSessionStatus, DeviceClaimStatus } from '@prisma/client';
import { createHash } from 'crypto';

import { ClaimConfirmRequestDto } from './dto/claim-confirm-request.dto';
import { ClaimConfirmResponseDto } from './dto/claim-confirm-response.dto';
import { ClaimInfoResponseDto } from './dto/claim-info-response.dto';

@Injectable()
export class ClaimService {
  constructor(private readonly prisma: PrismaService) {}

  async getClaimInfo(token: string): Promise<ClaimInfoResponseDto> {
    const nonceHash = createHash('sha256').update(token).digest('hex');

    const session = await this.prisma.claimSession.findUnique({
      where: { nonceHash },
      include: { device: true },
    });

    if (!session) {
      throw new NotFoundException('Claim session not found or expired');
    }

    if (session.expiresAt < new Date()) {
      if (session.status === ClaimSessionStatus.pending) {
        await this.prisma.claimSession.update({
          where: { id: session.id },
          data: { status: ClaimSessionStatus.expired },
        });
      }
      throw new NotFoundException('Claim session not found or expired');
    }

    if (session.status !== ClaimSessionStatus.pending) {
      throw new ConflictException('Claim session already used');
    }

    return {
      claim_session_id: session.id,
      device_uid: session.device.uid,
      expires_at: session.expiresAt.toISOString(),
    };
  }

  async confirmClaim(dto: ClaimConfirmRequestDto, userId: number): Promise<ClaimConfirmResponseDto> {
    const nonceHash = createHash('sha256').update(dto.token).digest('hex');

    const session = await this.prisma.claimSession.findUnique({
      where: { nonceHash },
      include: { device: true },
    });

    if (!session) {
      throw new NotFoundException('Claim session not found');
    }

    if (session.expiresAt <= new Date()) {
      throw new ConflictException('Claim session expired');
    }

    if (session.status !== ClaimSessionStatus.pending) {
      throw new ConflictException('Claim session already used or expired');
    }

    if (session.device.claimStatus === DeviceClaimStatus.claimed) {
      throw new ConflictException('Device already claimed');
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.device.update({
        where: { id: session.deviceId },
        data: {
          userId,
          claimStatus: DeviceClaimStatus.claimed,
          claimedAt: now,
        },
      }),
      this.prisma.claimSession.update({
        where: { id: session.id },
        data: {
          status: ClaimSessionStatus.used,
          usedAt: now,
          claimedByUserId: userId,
        },
      }),
    ]);

    return { success: true, device_uid: session.device.uid };
  }
}
