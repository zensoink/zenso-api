import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ClaimService } from './claim.service';
import { ClaimConfirmRequestDto } from './dto/claim-confirm-request.dto';
import { ClaimConfirmResponseDto } from './dto/claim-confirm-response.dto';

@ApiTags('Claim')
@Controller()
export class ClaimController {
  constructor(private readonly claimService: ClaimService) {}

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiBearerAuth('user-jwt')
  @UseGuards(UserJwtAuthGuard)
  @Post('claim/confirm')
  @ApiOperation({
    summary: 'Confirm device claim',
    description:
      'Claims a device for the authenticated user. Upserts a device record and returns ' +
      'the raw device secret (shown once). Rate-limited to 10 requests per minute.',
  })
  @ApiCreatedResponse({
    type: ClaimConfirmResponseDto,
    description: 'Claim confirmed — success flag and hardware ID',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — valid user JWT required' })
  @ApiResponse({ status: 404, description: 'Claim token not found or expired' })
  async confirmClaim(
    @Body() dto: ClaimConfirmRequestDto,
    @Req() req: { user: { userId: number } }
  ): Promise<ClaimConfirmResponseDto> {
    return this.claimService.confirmClaim(dto, req.user.userId);
  }
}
