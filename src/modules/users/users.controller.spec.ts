import { Test, TestingModule } from '@nestjs/testing';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const mockUsersService = {
    createUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a user', async () => {
    const createUserDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    const expectedUser = {
      id: 1,
      name: createUserDto.name,
      email: createUserDto.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUsersService.createUser.mockResolvedValue(expectedUser);

    const result = await controller.create(createUserDto);

    expect(mockUsersService.createUser).toHaveBeenCalledWith(createUserDto);
    expect(result).toEqual(expectedUser);
  });
});
