import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('venues')
export class VenuesController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getVenues() {
    // Temporary fake data – just to confirm protection works
    return [
      { id: 1, name: 'Test Venue 1' },
      { id: 2, name: 'Test Venue 2' },
    ];
  }
}
