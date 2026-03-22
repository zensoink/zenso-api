import { Body, Controller, Post } from '@nestjs/common';

import { CreateUserDTO } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUser: CreateUserDTO) {
    return this.usersService.createUser(createUser);
  }
}
