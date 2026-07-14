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
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'User login' })
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
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Returns new JWT access token, sets new refresh token cookie' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
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
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Clears refresh token and cookie' })
  async logout(@Req() req: { user: { userId: number; email: string } }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.userId);

    res.clearCookie(REFRESH_COOKIE, { path: '/' });

    return { message: 'Logged out' };
  }

  @Post('device/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Device login' })
  @ApiBody({ type: DeviceLoginDto })
  @ApiResponse({ status: 200, description: 'Returns device JWT access token' })
  @ApiResponse({ status: 401, description: 'Invalid hardwareId or secret' })
  async deviceLogin(@Body() dto: DeviceLoginDto) {
    return this.authService.deviceLogin(dto.hardware_id, dto.secret);
  }
}
