// src/modules/auth/auth.controller.ts
import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';

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

  // -------------------------
  // LOGIN / REGISTER
  // -------------------------

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

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // -------------------------
  // PASSWORD RESET
  // -------------------------

  @Post('request-password-reset')
  async requestPasswordReset(
    @Body('email') email: string,
    @Req() req: Request,
  ) {
    return this.authService.requestPasswordReset(email, {
      requestedIp: req.ip,
      requestedUserAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }

  // -------------------------
  // EMAIL VERIFICATION
  // -------------------------

  @Post('request-email-verification')
  async requestEmailVerification(@Body('email') email: string) {
    return this.authService.requestEmailVerification(email);
  }

  @Post('verify-email')
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // -------------------------
  // AUTH PROFILE
  // -------------------------

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

    let desiredType: ProfileType | null = null;
    if (role === 'owner') desiredType = ProfileType.OWNER;
    if (role === 'buyer') desiredType = ProfileType.BUYER;
    if (role === 'staff') desiredType = ProfileType.STAFF;

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