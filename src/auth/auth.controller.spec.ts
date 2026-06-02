import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('register', () => {
    it('should call authService.register and return result', async () => {
      const dto = { name: 'Bintang', email: 'bintang@example.com', password: 'Password123!' };
      const mockResult = { user: mockUser, access_token: 'token' };
      authService.register.mockResolvedValue(mockResult);

      const result = await controller.register(dto as any);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('data', mockResult);
      expect(result.message).toBe('User registered successfully');
    });
  });

  describe('login', () => {
    it('should call authService.login and return tokens', async () => {
      const dto = { email: 'bintang@example.com', password: 'Password123!' };
      const mockResult = { access_token: 'token', expires_in: 3600 };
      authService.login.mockResolvedValue(mockResult);

      const result = await controller.login(dto as any);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result.data).toHaveProperty('access_token');
      expect(result.message).toBe('Login successful');
    });
  });
});
