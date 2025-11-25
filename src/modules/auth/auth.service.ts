import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(user: any) {
    const payload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUser(email: string, password: string) {
    // ✅ TEMPORARY HARDCODED USER
    // Use exactly these credentials when testing:
    // email:    test@example.com
    // password: 123456
    const validEmail = 'test@example.com';
    const validPassword = '123456';

    if (email === validEmail && password === validPassword) {
      return { id: 1, email };
    }

    // ❌ If invalid, throw 401 instead of returning null (which caused 500)
    throw new UnauthorizedException('Invalid email or password');
  }
}
