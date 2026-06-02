import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: User = {
    id: 'user-uuid-1',
    name: 'Bintang',
    email: 'bintang@example.com',
    password: 'hashed',
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findById('user-uuid-1');
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-uuid-1' } });
    });

    it('should return null when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findByEmail('bintang@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should return null for unknown email', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.findByEmail('nobody@example.com');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a user when email is unique', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create({
        name: 'Bintang',
        email: 'bintang@example.com',
        password: 'hashed',
      });

      expect(result).toEqual(mockUser);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.create({ email: 'bintang@example.com', name: 'Test', password: 'pass' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
