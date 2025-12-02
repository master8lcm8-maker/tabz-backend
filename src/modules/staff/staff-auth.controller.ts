import { Body, Controller, Post } from '@nestjs/common';
import { StaffAuthService } from './staff-auth.service';

class StaffLoginDto {
  email: string;
  password: string;
}

@Controller('staff')
export class StaffAuthController {
  constructor(private readonly staffAuthService: StaffAuthService) {}

  @Post('login')
  async login(@Body() body: StaffLoginDto) {
    const { email, password } = body;
    return this.staffAuthService.login(email, password);
  }
}
