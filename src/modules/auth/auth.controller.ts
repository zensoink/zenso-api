import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { DeviceLoginDto } from './dto/device-login.dto';
import { UserLoginDto } from './dto/user-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: UserLoginDto })
  @ApiResponse({ status: 200, description: 'Returns JWT access token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: UserLoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('device/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Device login' })
  @ApiBody({ type: DeviceLoginDto })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401 })
  async deviceLogin(@Body() dto: DeviceLoginDto) {
    return this.authService.deviceLogin(dto.uid, dto.secret);
  }
}
