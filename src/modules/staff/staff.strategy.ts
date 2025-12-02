import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class StaffStrategy extends PassportStrategy(Strategy, 'staff-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'TABZ_STAFF_JWT_SECRET', // temp; move to env later
    });
  }

  async validate(payload: any) {
    // This becomes req.user in staff-protected routes
    return {
      staffId: payload.sub,
      venueId: payload.venueId,
      isStaff: payload.isStaff ?? true,
    };
  }
}
