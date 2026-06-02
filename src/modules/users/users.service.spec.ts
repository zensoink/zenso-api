import { PrismaService } from '@core/prisma';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { CreateUserDTO } from './dto/create-user.dto';
import { UsersService } from './users.service';

interface CreateUserData {
  email: string;
  name: string | null;
  passwordHash: string;
}

type ExpectedUser = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

interface MockPrismaService {
  user: {
    create: jest.Mock<Promise<ExpectedUser>, [{ data: CreateUserData }]>;
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let mockPrismaService: MockPrismaService;

  const expectedUser: ExpectedUser = {
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
        create: jest.fn<Promise<ExpectedUser>, [{ data: CreateUserData }]>().mockResolvedValue(expectedUser),
      },
    };

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

    const { data } = mockPrismaService.user.create.mock.calls[0][0];
    expect(data.email).toBe('john@example.com');
    expect(data.name).toBe('John Doe');
    expect(data.passwordHash).toBeDefined();
    expect(data.passwordHash).not.toBe('plaintext-password-123');

    const isHash = await bcrypt.compare('plaintext-password-123', data.passwordHash);
    expect(isHash).toBe(true);
  });

  it('should create a user with null name when name is not provided', async () => {
    const createUserDto: CreateUserDTO = {
      email: 'noname@example.com',
      password: 'another-password-456',
    };

    await service.createUser(createUserDto);

    const { data } = mockPrismaService.user.create.mock.calls[0][0];
    expect(data.name).toBeNull();
  });
});
