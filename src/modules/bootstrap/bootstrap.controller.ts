import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { BootstrapService } from './bootstrap.service';
import { BootstrapRequestDto } from './dto/bootstrap-request.dto';
import { BootstrapResponseDto } from './dto/bootstrap-response.dto';
import { ClaimStatusResponseDto } from './dto/claim-status-response.dto';

@ApiTags('Bootstrap')
@Controller('device')
export class BootstrapController {
  constructor(private readonly bootstrapService: BootstrapService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('bootstrap')
  @ApiOperation({
    summary: 'Bootstrap a new device',
    description:
      'First call a device makes after power-on. Creates a claim session and returns a URL ' +
      'that the device owner visits to claim the device. The claim URL is typically rendered ' +
      'as a QR code on the e-ink display. Rate-limited to 5 requests per minute.',
  })
  @ApiCreatedResponse({
    type: BootstrapResponseDto,
    description: 'Claim session created — URL, session ID, and expiry',
  })
  @ApiResponse({ status: 400, description: 'Validation error — missing or invalid fields' })
  async bootstrap(@Body() dto: BootstrapRequestDto): Promise<BootstrapResponseDto> {
    return this.bootstrapService.bootstrap(dto);
  }

  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Get('claim-status/:claimSessionId')
  @ApiOperation({
    summary: 'Poll claim session status',
    description:
      'Polled by the device to check whether the claim session has been confirmed by a user. ' +
      'Returns the device secret once claimed, allowing the device to log in via device-jwt auth. ' +
      'Rate-limited to 30 requests per minute.',
  })
  @ApiOkResponse({
    type: ClaimStatusResponseDto,
    description: 'Current claim status + device credentials (only when claimed)',
  })
  @ApiResponse({ status: 404, description: 'Claim session not found or expired' })
  async getClaimStatus(@Param('claimSessionId') claimSessionId: string): Promise<ClaimStatusResponseDto> {
    return this.bootstrapService.getClaimStatus(claimSessionId);
  }
}
