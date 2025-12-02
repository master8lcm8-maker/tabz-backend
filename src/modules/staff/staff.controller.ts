import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffAuthGuard } from './staff-auth.guard';
import { StaffAuthService } from './staff-auth.service';
import { Request } from 'express';

class StaffLoginDto {
  email: string;
  password: string;
}

@Controller('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly staffAuthService: StaffAuthService,
  ) {}

  // STAFF LOGIN
  @Post('login')
  async login(@Body() dto: StaffLoginDto) {
    const staff = await this.staffService.validLogin(dto.email, dto.password);

    if (!staff) {
      throw new UnauthorizedException('Invalid staff email or password');
    }

    return this.staffAuthService.issueToken(staff);
  }

  // GET STAFF PROFILE (JWT PROTECTED)
  @UseGuards(StaffAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const staff = req.user as any;

    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      venueId: staff.venueId,
    };
  }
}
