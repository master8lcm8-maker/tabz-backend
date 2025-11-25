import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('staff')
export class StaffController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getStaffView() {
    // Temporary fake data – just to confirm protection works
    return [
      { id: 1, role: 'bartender', name: 'Staff Member 1' },
      { id: 2, role: 'security', name: 'Staff Member 2' },
    ];
  }
}
