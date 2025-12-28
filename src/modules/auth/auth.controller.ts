// src/modules/auth/auth.controller.ts
import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dtos/login.dto';

interface AuthRequest extends Request {
  user?: {
    sub: number;
    email: string;
    role: 'owner' | 'buyer' | 'staff';
    venueId?: number;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('login-buyer')
  async loginBuyer(@Body() dto: LoginDto) {
    return this.authService.loginBuyer(dto);
  }

  @Post('login-owner')
  async loginOwner(@Body() dto: LoginDto) {
    return this.authService.loginOwner(dto);
  }

  // ✅ NEW
  @Post('login-staff')
  async loginStaff(@Body() dto: LoginDto) {
    return this.authService.loginStaff(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthRequest) {
    return {
      userId: req.user?.sub ?? null,
      email: req.user?.email ?? null,
      role: req.user?.role ?? null,
      venueId: req.user?.venueId ?? null,
    };
  }
}
