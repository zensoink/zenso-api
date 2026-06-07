export class ClaimStatusResponseDto {
  status!: 'pending' | 'active' | 'expired';
  uid?: string;
  device_secret?: string;
}
