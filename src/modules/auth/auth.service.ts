import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface DemoUser {
  id: number;
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  private readonly demoUser: DemoUser = {
    id: 1,
    email: 'demo@tabz.app',
    password: 'password123',
  };

  constructor(private readonly jwtService: JwtService) {}

  async validateUser(email: string, password: string) {
    if (email === this.demoUser.email && password === this.demoUser.password) {
      const { password: _pw, ...safeUser } = this.demoUser;
      return safeUser;
    }
    return null;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getProfile(user: any) {
    return user;
  }
}
