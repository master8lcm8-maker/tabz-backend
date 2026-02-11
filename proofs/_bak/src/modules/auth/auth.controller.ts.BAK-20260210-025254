// src/modules/auth/auth.controller.ts
import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dtos/login.dto';

import { ProfileService } from '../../profile/profile.service';
import { ProfileType } from '../../profile/profile.types';

interface AuthRequest extends Request {
  user?: {
    sub: number;
    email: string;
    role: 'owner' | 'buyer' | 'staff';
    venueId?: number;
    id?: number;
    userId?: number;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly profileService: ProfileService,
  ) {}

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

  @Post('login-staff')
  async loginStaff(@Body() dto: LoginDto) {
    return this.authService.loginStaff(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthRequest) {
    const userId =
      Number(req.user?.sub ?? req.user?.id ?? req.user?.userId ?? 0) || null;

    const email = req.user?.email ?? null;
    const role = req.user?.role ?? null;
    const venueId = req.user?.venueId ?? null;

    if (!userId) {
      return {
        userId: null,
        email,
        role,
        venueId,
        profileId: null,
        profile: null,
        profiles: [],
      };
    }

    const profiles = await this.profileService.listForUser(userId);

    // 1) Map role → desired ProfileType (NOW includes staff)
    let desiredType: ProfileType | null = null;
    if (role === 'owner') desiredType = ProfileType.OWNER;
    if (role === 'buyer') desiredType = ProfileType.BUYER;
    if (role === 'staff') desiredType = ProfileType.STAFF;

    // 2) Pick primary profile:
    //    - prefer role-matching active profile
    //    - else first active profile
    //    - else first profile (stable fallback)
    const profile =
      (desiredType
        ? profiles.find(
            (p: any) =>
              String(p?.type) === String(desiredType) && p?.isActive !== false,
          )
        : null) ??
      profiles.find((p: any) => p?.isActive !== false) ??
      profiles[0] ??
      null;

    return {
      userId,
      email,
      role,
      venueId,
      profileId: profile?.id ?? null,
      profile,
      profiles,
    };
  }
}
