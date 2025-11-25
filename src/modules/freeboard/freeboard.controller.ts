import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('freeboard')
export class FreeboardController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getFreeboardItems() {
    // Temporary fake data – just to confirm protection works
    return [
      { id: 1, title: 'Free Shot Drop', status: 'active' },
      { id: 2, title: 'VIP Entry Drop', status: 'active' },
    ];
  }
}
