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
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'dev_jwt_secret_fallback',
    });
  }

  async validate(payload: JwtPayload) {
    const userId = Number(payload.sub);
    const email = payload.email;
    const role = payload.role;
    const venueId = Number((payload as any).venueId || 0) || undefined;

    // This is what becomes req.user
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
