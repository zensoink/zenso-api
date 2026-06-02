/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

import { PrismaService } from '@core/prisma';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { CreateUserDTO } from './dto/create-user.dto';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrismaService: jest.Mocked<PrismaService>;

  const expectedUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: '$2b$10$somehashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        create: jest.fn().mockResolvedValue(expectedUser),
      },
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a user with hashed password', async () => {
    const createUserDto: CreateUserDTO = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'plaintext-password-123',
    };

    const result = await service.createUser(createUserDto);

    expect(result).toEqual(expectedUser);

    const createCall = mockPrismaService.user.create.mock.calls[0][0];
    expect(createCall.data.email).toBe('john@example.com');
    expect(createCall.data.name).toBe('John Doe');
    expect(createCall.data.passwordHash).toBeDefined();
    expect(createCall.data.passwordHash).not.toBe('plaintext-password-123');

    const isHash = await bcrypt.compare('plaintext-password-123', createCall.data.passwordHash);
    expect(isHash).toBe(true);
  });

  it('should create a user with null name when name is not provided', async () => {
    const createUserDto: CreateUserDTO = {
      email: 'noname@example.com',
      password: 'another-password-456',
    };

    await service.createUser(createUserDto);

    const createCall = mockPrismaService.user.create.mock.calls[0][0];
    expect(createCall.data.name).toBeNull();
  });
});
