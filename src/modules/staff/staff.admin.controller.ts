import { Controller, Post, Body } from '@nestjs/common';
import { StaffService } from './staff.service';

class CreateStaffDto {
  venueId: number;
  name: string;
  email: string;
  password: string;
}

@Controller('staff-admin')
export class StaffAdminController {
  constructor(private readonly staffService: StaffService) {}

  @Post('create')
  async createStaff(@Body() dto: CreateStaffDto) {
    const staff = await this.staffService.createStaff(
      dto.venueId,
      dto.name,
      dto.email,
      dto.password,
    );

    return {
      id: staff.id,
      venueId: staff.venueId,
      name: staff.name,
      email: staff.email,
      createdAt: staff.createdAt,
    };
  }
}
