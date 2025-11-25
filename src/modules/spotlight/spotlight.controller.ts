import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('spotlight')
export class SpotlightController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getSpotlights() {
    // Temporary fake data – just to confirm protection works
    return [
      { id: 1, title: 'Main Dance Floor Spotlight', active: true },
      { id: 2, title: 'VIP Table Spotlight', active: false },
    ];
  }
}
