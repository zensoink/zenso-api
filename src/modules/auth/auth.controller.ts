import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthService } from './auth.service';
import { DeviceLoginDto } from './dto/device-login.dto';
import { UserLoginDto } from './dto/user-login.dto';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { UserJwtAuthGuard } from './guards/user-jwt-auth.guard';

const REFRESH_COOKIE = 'refresh_token';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates a user with email and password. Returns a JWT access token ' +
      '(user-jwt scheme) and sets a refresh token as an httpOnly cookie. ' +
      'Use the access token for all user-facing endpoints (devices, screens, plugins).',
  })
  @ApiBody({ type: UserLoginDto })
  @ApiResponse({ status: 200, description: 'Returns JWT access token, sets refresh token cookie' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: UserLoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.login(dto.email, dto.password);

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);

    return { accessToken };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Uses the refresh token stored in the httpOnly cookie to issue a new access token ' +
      'and a new refresh token (rotation). The old refresh token is invalidated.',
  })
  @ApiResponse({ status: 200, description: 'Returns new JWT access token, sets new refresh token cookie' })
  async refresh(
    @Req() req: { cookies: Record<string, string | undefined>; user: { userId: number; email: string } },
    @Res({ passthrough: true }) res: Response
  ) {
    const rawToken = req.cookies[REFRESH_COOKIE];
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const { accessToken, refreshToken } = await this.authService.refreshTokens(req.user.userId, rawToken);

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);

    return { accessToken };
  }

  @Post('logout')
  @UseGuards(UserJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Invalidates the current refresh token in the database and clears the refresh token cookie. ' +
      'The access token remains valid until its natural expiry.',
  })
  @ApiBearerAuth('user-jwt')
  @ApiResponse({ status: 200, description: 'Clears refresh token and cookie' })
  async logout(@Req() req: { user: { userId: number; email: string } }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.userId);

    res.clearCookie(REFRESH_COOKIE, { path: '/' });

    return { message: 'Logged out' };
  }

  @Post('device/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Device login',
    description:
      'Authenticates a device using its hardware_id and secret (obtained during bootstrap/claim). ' +
      'Returns a JWT access token (device-jwt scheme). Use this token for device endpoints: ' +
      'check-in and display fetch.',
  })
  @ApiBody({ type: DeviceLoginDto })
  @ApiResponse({ status: 200, description: 'Returns device JWT access token' })
  @ApiResponse({ status: 401, description: 'Invalid hardwareId or secret' })
  async deviceLogin(@Body() dto: DeviceLoginDto) {
    return this.authService.deviceLogin(dto.hardware_id, dto.secret);
  }
}
