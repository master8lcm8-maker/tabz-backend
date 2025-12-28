// src/modules/staff/staff-auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StaffService } from './staff.service';

@Injectable()
export class StaffAuthService {
  constructor(
    private readonly staffService: StaffService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * DEV STAFF LOGIN
   *
   * Called from StaffAuthController:
   *   this.staffAuthService.login(email, password)
   */
  async login(email: string, password: string) {
    const staff = await this.staffService.validateCredentials(email, password);

    if (!staff) {
      throw new UnauthorizedException('Invalid staff credentials');
    }

    const payload = {
      sub: staff.id,
      email: staff.email,
      venueId: staff.venueId,
      role: 'STAFF',
      type: 'STAFF',
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        venueId: staff.venueId,
      },
    };
  }
}
