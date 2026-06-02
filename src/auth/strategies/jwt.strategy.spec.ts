import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { User, UserRole } from '../../users/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const mockUsersService = {
    findById: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

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

  beforeEach(() => {
    strategy = new JwtStrategy(
      mockConfigService as any,
      mockUsersService as any,
    );
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user when token is valid', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await strategy.validate({
        sub: 'user-uuid-1',
        email: 'bintang@example.com',
        role: 'customer',
      });

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-uuid-1');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        strategy.validate({
          sub: 'nonexistent',
          email: 'nobody@example.com',
          role: 'customer',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
