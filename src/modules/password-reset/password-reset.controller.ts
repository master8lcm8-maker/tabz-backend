import { Controller, Post, Body } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';

@Controller('password-reset')
export class PasswordResetController {
  constructor(private readonly service: PasswordResetService) {}

  @Post('request')
  async requestReset(@Body() body: any) {
    return { ok: true };
  }

  @Post('confirm')
  async confirmReset(@Body() body: any) {
    return { ok: true };
  }
}
