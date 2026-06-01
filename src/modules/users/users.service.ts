import { PrismaService } from '@core/prisma';
import { Injectable, Logger } from '@nestjs/common';

import { CreateUserDTO } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prismaService: PrismaService) {}

  createUser(createUserDTO: CreateUserDTO) {
    this.logger.debug(`Creating user: ${createUserDTO.email}`);
    return this.prismaService.user.create({ data: createUserDTO });
  }
}
