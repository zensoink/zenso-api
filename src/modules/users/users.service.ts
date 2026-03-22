import { PrismaService } from '@core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

import { CreateUserDTO } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  createUser(createUserDTO: CreateUserDTO) {
    console.log('createUserDTo', createUserDTO);
    return this.prismaService.user.create({ data: createUserDTO });
  }
}
