import { DeviceClaimStatus } from '@prisma/client';

export class ClaimStatusResponseDto {
  status!: Exclude<DeviceClaimStatus, 'claimed'> | 'active';
}
