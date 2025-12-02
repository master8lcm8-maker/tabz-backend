import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface StaffLoginDto {
  email: string;
  password: string;
}

@Injectable()
export class StaffAuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * DEV-ONLY LOGIN
   *
   * Accept exactly:
   *   email:    demo@tabz.app
   *   password: password123
   *
   * Ignore the database completely. Return a fake staff user + real JWT.
   */
  async login(dto: StaffLoginDto) {
    const { email, password } = dto;

    // ✅ Hard-coded dev credentials
    if (email !== 'demo@tabz.app' || password !== 'password123') {
      throw new UnauthorizedException('Invalid staff email or password');
    }

    // Minimal staff object the rest of app can rely on
    const staff = {
      id: 1,
      email: 'demo@tabz.app',
      name: 'Demo Staff',
      role: 'staff',
      venueId: 1,
    };

    const payload = {
      sub: staff.id,
      email: staff.email,
      venueId: staff.venueId,
      role: staff.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      staff,
    };
  }
}
