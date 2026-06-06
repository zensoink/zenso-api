import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { BootstrapService } from './bootstrap.service';
import { BootstrapRequestDto } from './dto/bootstrap-request.dto';
import { BootstrapResponseDto } from './dto/bootstrap-response.dto';
import { ClaimStatusResponseDto } from './dto/claim-status-response.dto';

@Controller('device')
export class BootstrapController {
  constructor(private readonly bootstrapService: BootstrapService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('bootstrap')
  async bootstrap(@Body() dto: BootstrapRequestDto): Promise<BootstrapResponseDto> {
    return this.bootstrapService.bootstrap(dto);
  }

  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Get('claim-status/:claimSessionId')
  async getClaimStatus(@Param('claimSessionId', ParseIntPipe) claimSessionId: number): Promise<ClaimStatusResponseDto> {
    return this.bootstrapService.getClaimStatus(claimSessionId);
  }
}
