import { PrismaService } from '@core/prisma';
import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { CreateUserDTO } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async createUser(createUserDTO: CreateUserDTO) {
    this.logger.debug(`Creating user: ${createUserDTO.email}`);

    const passwordHash = await bcrypt.hash(createUserDTO.password, 10);

    return this.prismaService.user.create({
      data: {
        name: createUserDTO.name ?? null,
        email: createUserDTO.email,
        passwordHash,
      },
    });
  }
}
