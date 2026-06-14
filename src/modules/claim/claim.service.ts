import { PrismaService } from '@core/prisma';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ClaimSessionStatus, DeviceClaimStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

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
      hardware_id: session.hardwareId,
      expires_at: session.expiresAt.toISOString(),
    };
  }

  async confirmClaim(dto: ClaimConfirmRequestDto, userId: number): Promise<ClaimConfirmResponseDto> {
    const nonceHash = createHash('sha256').update(dto.token).digest('hex');

    const session = await this.prisma.claimSession.findUnique({
      where: { nonceHash },
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

    const now = new Date();
    const rawSecret = randomBytes(32).toString('hex');
    const deviceSecretHash = await bcrypt.hash(rawSecret, 10);

    const device = await this.prisma.$transaction(async tx => {
      const newDevice = await tx.device.upsert({
        where: {
          userId_hardwareId: {
            userId,
            hardwareId: session.hardwareId,
          },
        },
        create: {
          hardwareId: session.hardwareId,
          name: session.hardwareId,
          userId,
          claimStatus: DeviceClaimStatus.claimed,
          claimedAt: now,
          lastBootstrapAt: now,
          deviceSecretHash,
          postClaimSecret: rawSecret,
          deviceTokenVersion: 1,
          firmwareVersion: session.firmwareVersion,
          hardwareInfoJson: session.hardwareInfoJson ?? undefined,
          displayInfoJson: session.displayInfoJson ?? undefined,
        },
        update: {
          userId,
          claimStatus: DeviceClaimStatus.claimed,
          claimedAt: now,
          lastBootstrapAt: now,
          deviceSecretHash,
          postClaimSecret: rawSecret,
          deviceTokenVersion: { increment: 1 },
          revokedAt: null,
          firmwareVersion: session.firmwareVersion,
          hardwareInfoJson: session.hardwareInfoJson ?? undefined,
          displayInfoJson: session.displayInfoJson ?? undefined,
        },
      });

      await tx.claimSession.update({
        where: { id: session.id },
        data: {
          status: ClaimSessionStatus.used,
          usedAt: now,
          claimedByUserId: userId,
          deviceId: newDevice.id,
        },
      });

      await tx.device.updateMany({
        where: {
          hardwareId: session.hardwareId,
          id: { not: newDevice.id },
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      return newDevice;
    });

    return { success: true, hardware_id: device.hardwareId };
  }
}
