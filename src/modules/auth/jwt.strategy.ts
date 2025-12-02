import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'defaultsecret',
    });
  }

  async validate(payload: any) {
    // -----------------------------------------
    // CASE 1: REGULAR USER TOKEN
    // -----------------------------------------
    if (payload.sub && payload.email) {
      return {
        userId: payload.sub,
        email: payload.email,
        type: 'USER',
      };
    }

    // -----------------------------------------
    // CASE 2: STAFF TOKEN
    // -----------------------------------------
    if (payload.staffId && payload.venueId) {
      return {
        staffId: payload.staffId,
        venueId: payload.venueId,
        role: payload.role,
        email: payload.email,
        type: 'STAFF',
      };
    }

    // -----------------------------------------
    // INVALID TOKEN
    // -----------------------------------------
    throw new UnauthorizedException('Invalid JWT payload');
  }
}
