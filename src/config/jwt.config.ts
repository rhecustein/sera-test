import { JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export const jwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>(
    'JWT_SECRET',
    'sera-super-secret-jwt-key-minimum-32-chars',
  ),
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h') as any,
  },
});
