// src/modules/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from './auth.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role?: UserRole;
  venueId?: number; // ✅ for staff tokens
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
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
    const email = payload.email;
    const role = payload.role;
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
