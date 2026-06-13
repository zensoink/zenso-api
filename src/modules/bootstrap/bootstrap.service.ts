import { PrismaService, toPrismaJson } from '@core/prisma';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BootstrapClaimStatus, ClaimSessionStatus } from '@prisma/client';
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
    const hardwareId = dto.hardware_id;

    const existingSession = await this.prisma.claimSession.findFirst({
      where: {
        hardwareId,
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
          hardwareId,
          nonceHash,
          status: ClaimSessionStatus.pending,
          expiresAt,
          firmwareVersion: dto.firmware_version,
          hardwareInfoJson: dto.hardware_info ? toPrismaJson(dto.hardware_info) : undefined,
          displayInfoJson: dto.display_info ? toPrismaJson(dto.display_info) : undefined,
        },
      });
    });

    const baseUrl = this.configService.get<string>('app.baseUrl');
    return {
      claim_url: `${baseUrl}/claim/${plaintextToken}`,
      claim_session_id: session.id,
      claim_expires_at: expiresAt.toISOString(),
    };
  }

  async getClaimStatus(claimSessionId: number): Promise<ClaimStatusResponseDto> {
    const session = await this.prisma.claimSession.findUnique({
      where: { id: claimSessionId },
      include: { device: true },
    });

    if (!session) {
      return { status: BootstrapClaimStatus.expired };
    }

    if (session.status === ClaimSessionStatus.used) {
      const hardwareId = session.device?.hardwareId;
      const postClaimSecret = session.device?.postClaimSecret;

      if (postClaimSecret && session.device) {
        await this.prisma.device.update({
          where: { id: session.device.id },
          data: { postClaimSecret: null },
        });
      }

      return {
        status: BootstrapClaimStatus.active,
        hardware_id: hardwareId ?? undefined,
        device_secret: postClaimSecret ?? undefined,
      };
    }

    if (session.status === ClaimSessionStatus.cancelled) {
      await this.prisma.claimSession.update({
        where: { id: session.id },
        data: { status: ClaimSessionStatus.expired },
      });
      return { status: BootstrapClaimStatus.expired };
    }

    if (session.expiresAt < new Date() && session.status === ClaimSessionStatus.pending) {
      await this.prisma.claimSession.update({
        where: { id: session.id },
        data: { status: ClaimSessionStatus.expired },
      });
      return { status: BootstrapClaimStatus.expired };
    }

    return { status: BootstrapClaimStatus.pending };
  }
}
