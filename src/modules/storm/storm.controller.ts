import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('storm')
export class StormController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getStormStatus() {
    // Temporary fake data – just to confirm protection works
    return {
      status: 'idle',
      hypeLevel: 0,
      target: 'Not set',
    };
  }
}
