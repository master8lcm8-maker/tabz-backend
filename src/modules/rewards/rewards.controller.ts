import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rewards')
export class RewardsController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getRewards() {
    // Temporary fake data – just to confirm protection works
    return [
      { id: 1, name: 'Free Drink Reward', points: 100 },
      { id: 2, name: 'VIP Entry Reward', points: 250 },
    ];
  }
}
