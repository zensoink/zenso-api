import { PrismaService } from '@core/prisma';
import { Test, TestingModule } from '@nestjs/testing';

import { CreateUserDTO } from './dto/create-user.dto';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockUserCreate = jest.fn();

    mockPrismaService = {
      user: {
        create: mockUserCreate,
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

  it('should create a user', async () => {
    const createUserDto: CreateUserDTO = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const expectedUser = {
      id: 1,
      name: createUserDto.name,
      email: createUserDto.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCreate = jest.fn().mockResolvedValue(expectedUser);
    mockPrismaService.user.create = mockCreate;

    const result = await service.createUser(createUserDto);

    expect(mockCreate).toHaveBeenCalledWith({
      data: createUserDto,
    });
    expect(result).toEqual(expectedUser);
  });
});
