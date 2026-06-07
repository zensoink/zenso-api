import { PrismaService, toPrismaJson } from '@core/prisma';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClaimSessionStatus, DeviceClaimStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

import { BootstrapRequestDto } from './dto/bootstrap-request.dto';
import { BootstrapResponseDto } from './dto/bootstrap-response.dto';
import { ClaimStatusResponseDto } from './dto/claim-status-response.dto';

@Injectable()
export class BootstrapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async bootstrap(dto: BootstrapRequestDto): Promise<BootstrapResponseDto> {
    let device = await this.prisma.device.findUnique({
      where: { uid: dto.device_id },
    });

    if (!device) {
      device = await this.prisma.device.create({
        data: {
          uid: dto.device_id,
          name: dto.device_id,
          claimStatus: DeviceClaimStatus.pending,
          firmwareVersion: dto.firmware_version,
          hardwareInfoJson: dto.hardware_info ? toPrismaJson(dto.hardware_info) : undefined,
          displayInfoJson: dto.display_info ? toPrismaJson(dto.display_info) : undefined,
          lastBootstrapAt: new Date(),
        },
      });
    } else {
      await this.prisma.device.update({
        where: { id: device.id },
        data: {
          lastBootstrapAt: new Date(),
          firmwareVersion: dto.firmware_version,
          hardwareInfoJson: dto.hardware_info ? toPrismaJson(dto.hardware_info) : undefined,
          displayInfoJson: dto.display_info ? toPrismaJson(dto.display_info) : undefined,
        },
      });
    }

    if (device.claimStatus === DeviceClaimStatus.claimed) {
      return { claim_url: null, claim_session_id: null, claim_expires_at: null };
    }

    const existingSession = await this.prisma.claimSession.findFirst({
      where: {
        deviceId: device.id,
        status: ClaimSessionStatus.pending,
        expiresAt: { gt: new Date() },
      },
    });

    const plaintextToken = randomBytes(32).toString('hex');
    const nonceHash = createHash('sha256').update(plaintextToken).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const session = await this.prisma.$transaction(async tx => {
      if (existingSession) {
        await tx.claimSession.update({
          where: { id: existingSession.id },
          data: { status: ClaimSessionStatus.cancelled },
        });
      }
      return tx.claimSession.create({
        data: {
          deviceId: device.id,
          nonceHash,
          status: ClaimSessionStatus.pending,
          expiresAt,
        },
      });
    });

    const baseUrl = this.configService.get<string>('app.baseUrl');
    const claimUrl = `${baseUrl}/claim/${plaintextToken}`;

    return {
      claim_url: claimUrl,
      claim_session_id: session.id,
      claim_expires_at: expiresAt.toISOString(),
    };
  }

  async getClaimStatus(claimSessionId: number): Promise<ClaimStatusResponseDto> {
    const session = await this.prisma.claimSession.findUnique({
      where: { id: claimSessionId },
    });

    if (!session) {
      return { status: 'expired' };
    }

    if (session.status === ClaimSessionStatus.used) {
      return { status: 'active' };
    }

    if (session.status === ClaimSessionStatus.cancelled) {
      await this.prisma.claimSession.update({
        where: { id: session.id },
        data: { status: ClaimSessionStatus.expired },
      });
      return { status: 'expired' };
    }

    if (session.expiresAt < new Date() && session.status === ClaimSessionStatus.pending) {
      await this.prisma.claimSession.update({
        where: { id: session.id },
        data: { status: ClaimSessionStatus.expired },
      });
      return { status: 'expired' };
    }

    return { status: session.status };
  }
}
