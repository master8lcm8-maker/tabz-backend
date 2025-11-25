import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // TEMP endpoint just to prove JWT works.
  // Later we'll replace this with real login using Users.
  @Post('test-login')
  async testLogin() {
    const fakeUser = { id: 1, email: 'test@tabz.app' };
    return this.authService.login(fakeUser);
  }

  // Protected endpoint – requires Bearer token
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Req() req: any) {
    return req.user;
  }
}
