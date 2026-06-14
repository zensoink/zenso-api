import { BootstrapClaimStatus } from '@prisma/client';

export class ClaimStatusResponseDto {
  status!: BootstrapClaimStatus;
  hardware_id?: string;
  device_secret?: string;
}
