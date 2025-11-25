import { Injectable } from '@nestjs/common';
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
    // TEMPORARY: replace with real DB user lookup later.
    if (email === 'test@example.com' && password === '123456') {
      return { id: 1, email };
    }
    return null;
  }
}
