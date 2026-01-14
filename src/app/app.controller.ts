import { BadRequestException, Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Friendly root route so the domain doesn't look "broken"
  @Get('/')
  root() {
    return {
      ok: true,
      service: 'tabz-backend',
      message: 'TABZ API is running. Try /health',
    };
  }

  // Keep your existing health behavior exactly
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  // --------------------------------------------------
  // DEV ONLY — M31.2 proof: transport status must sync to payload.status
  // Expected: HTTP 403 with JSON { status: 403, ... }
  // --------------------------------------------------
  @Get('dev/m31-2-status-sync')
  devM312StatusSync() {
    throw new BadRequestException({
      message: 'm31_2_probe',
      detail: 'This is intentional.',
      status: 403,
    });
  }
}
