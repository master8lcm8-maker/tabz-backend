// src/modules/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { UserRole } from './auth.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role?: UserRole;
  venueId?: number; // ✅ for staff tokens
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService, private readonly usersService: UsersService) {
    // ✅ SINGLE SOURCE OF TRUTH for JWT secret (matches auth.module.ts)
    const secret =
      process.env.JWT_SECRET ||
      configService.get<string>('JWT_SECRET') ||
      'dev_jwt_secret_fallback';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const userId = Number(payload.sub);

    // P5.1: DB-backed validation so deleted/inactive users are rejected even with old JWTs
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }
    if ((user as any).deletedAt || (user as any).isActive === false) {
      throw new UnauthorizedException('Unauthorized');
    }

    const email = (user as any).email ?? payload.email;
    const role = (user as any).role ?? payload.role;
    const venueId = Number((payload as any).venueId || 0) || undefined;

    // This becomes req.user
    return {
      sub: userId,
      id: userId,
      userId: userId,
      ownerUserId: userId,
      ownerId: userId,
      email,
      role,

      // ✅ for staff endpoints
      venueId,
    };
  }
}

