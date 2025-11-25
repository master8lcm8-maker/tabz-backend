import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('drinks')
export class DrinksController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getDrinks() {
    // Temporary fake data – just to confirm protection works
    return [
      { id: 1, name: 'Mojito', price: 12 },
      { id: 2, name: 'Whiskey Sour', price: 14 },
    ];
  }
}
