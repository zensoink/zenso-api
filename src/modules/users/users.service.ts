import { PrismaService } from '@core/prisma';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { CreateUserDTO } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async createUser(createUserDTO: CreateUserDTO) {
    this.logger.debug(`Creating user: ${createUserDTO.email}`);

    const passwordHash = await bcrypt.hash(createUserDTO.password, 10);

    try {
      return await this.prismaService.user.create({
        data: {
          name: createUserDTO.name ?? null,
          email: createUserDTO.email,
          passwordHash,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email already in use');
      }
      throw e;
    }
  }
}
