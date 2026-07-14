import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateUserDTO } from './dto/create-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Register new user',
    description:
      'Creates a new user account. The password is hashed with bcrypt before storage. ' +
      'Email must be unique — returns 409 if already registered.',
  })
  @ApiBody({ type: CreateUserDTO })
  @ApiCreatedResponse({ description: 'User registered' })
  @ApiResponse({ status: 400, description: 'Validation error — missing or invalid fields' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  create(@Body() createUser: CreateUserDTO) {
    return this.usersService.createUser(createUser);
  }
}
