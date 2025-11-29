import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthUser {
  id: number;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * TEMP DEMO LOGIN
   * Accepts only demo@tabz.app / password123
   * for both localhost and DigitalOcean.
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    const DEMO_EMAIL = 'demo@tabz.app';
    const DEMO_PASSWORD = 'password123';

    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      return { id: 1, email: DEMO_EMAIL };
    }

    // Anything else = invalid
    return null;
  }

  async login(user: AuthUser) {
    const payload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
