import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { UsersService } from '../../users/users.service';

interface AuthPayload {
  sub: string;
  email: string;
  role: string;
}

export interface UiUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class UiAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async use(
    req: Request & { authUser?: AuthPayload; uiUser?: UiUser },
    res: Response,
    next: NextFunction,
  ) {
    const path = req.path;
    const token = this.getTokenFromCookies(req.headers.cookie);

    if (path === '/login') {
      if (token && this.isValidToken(token)) {
        res.redirect('/dashboard');
        return;
      }
      next();
      return;
    }

    const protectedPaths = [
      '/dashboard',
      '/profile',
      '/logout',
      '/ui/products',
      '/ui/orders',
    ];
    const isProtectedPath = protectedPaths.some(
      (protectedPath) =>
        path === protectedPath || path.startsWith(`${protectedPath}/`),
    );

    if (isProtectedPath) {
      if (!token) {
        res.redirect('/login?next=/dashboard');
        return;
      }

      try {
        const payload = this.jwtService.verify<AuthPayload>(token, {
          secret: this.configService.get<string>(
            'JWT_SECRET',
            'sera-super-secret-jwt-key-minimum-32-chars',
          ),
        });

        req.authUser = payload;

        const user = await this.usersService.findById(payload.sub);
        if (user) {
          req.uiUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        next();
        return;
      } catch {
        res.redirect('/login?next=/dashboard');
        return;
      }
    }

    next();
  }

  private getTokenFromCookies(cookieHeader?: string): string | undefined {
    if (!cookieHeader) return undefined;

    const cookie = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('sera_token='));

    return cookie
      ? decodeURIComponent(cookie.split('=').slice(1).join('='))
      : undefined;
  }

  private isValidToken(token: string): boolean {
    try {
      this.jwtService.verify(token, {
        secret: this.configService.get<string>(
          'JWT_SECRET',
          'sera-super-secret-jwt-key-minimum-32-chars',
        ),
      });
      return true;
    } catch {
      return false;
    }
  }
}
