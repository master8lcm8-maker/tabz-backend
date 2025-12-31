// src/profile/profile.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { ProfileService } from './profile.service';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  private getUserIdFromReq(req: any): number {
    // supports your JwtStrategy return shape (sub/id/userId/etc)
    const u = req?.user ?? {};
    const v =
      u.userId ??
      u.sub ??
      u.id ??
      u.ownerUserId ??
      u.ownerId ??
      null;

    const userId = Number(v);
    return Number.isFinite(userId) ? userId : 0;
  }

  private pickPrimaryProfile(req: any, profiles: any[]) {
    if (!profiles?.length) return null;

    const role = String(req?.user?.role || '').toLowerCase(); // owner | buyer | staff
    if (role) {
      const match = profiles.find(
        (p: any) => String(p?.type || '').toLowerCase() === role && p?.isActive !== false,
      );
      if (match) return match;
    }

    // fallback: first active profile (stable)
    const active = profiles.find((p: any) => p?.isActive !== false);
    return active ?? profiles[0];
  }

  // ✅ GET /profiles/me (auth read)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const userId = this.getUserIdFromReq(req);
    const profiles = userId ? await this.profileService.listForUser(userId) : [];
    const primary = this.pickPrimaryProfile(req, profiles);

    return {
      ok: true,
      userId: userId || null,
      profileId: primary?.id ?? null,
      profile: primary ?? null,
      profiles,
    };
  }

  // ✅ GET /profiles/:slug (public read)
  @Get(':slug')
  async bySlug(@Req() req: any) {
    const slug = String(req?.params?.slug || '').trim();
    const profile = await this.profileService.getBySlug(slug);
    return { ok: true, profile };
  }
}
