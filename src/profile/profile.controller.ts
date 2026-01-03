// src/profile/profile.controller.ts
import {
  Controller,
  Get,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Param,
  Patch,
  Body,
  ForbiddenException,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { SpacesUploadService } from '../storage/spaces-upload.service';

type PatchMeBody = {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
};

const PATCH_ME_ALLOWLIST = new Set(['displayName', 'bio', 'avatarUrl', 'coverUrl']);

@Controller('profiles')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly spaces: SpacesUploadService,
  ) {}

  private getUserIdFromReq(req: any): number {
    // supports your JwtStrategy return shape (sub/id/userId/etc)
    const u = req?.user ?? {};
    const v = u.userId ?? u.sub ?? u.id ?? u.ownerUserId ?? u.ownerId ?? null;

    const userId = Number(v);
    return Number.isFinite(userId) ? userId : 0;
  }

  private pickPrimaryProfile(req: any, profiles: any[]) {
    if (!profiles?.length) return null;

    const role = String(req?.user?.role || '').toLowerCase(); // owner | buyer | staff
    if (role) {
      const match = profiles.find(
        (p: any) =>
          String(p?.type || '').toLowerCase() === role && p?.isActive !== false,
      );
      if (match) return match;
    }

    // fallback: first active profile (stable)
    const active = profiles.find((p: any) => p?.isActive !== false);
    return active ?? profiles[0];
  }

  // ✅ GET /profiles/me (auth read)
  // M27.1 requirement: buyer/owner only (staff forbidden)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    if (role !== 'buyer' && role !== 'owner') {
      throw new ForbiddenException('forbidden');
    }

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

  // ✅ PATCH /profiles/me (auth write — update primary profile)
  // M27.2 requirement: buyer/owner only + allowlist only + reject extra keys
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async patchMe(@Req() req: any, @Body() body: PatchMeBody) {
    const role = String(req?.user?.role || '').toLowerCase();
    if (role !== 'buyer' && role !== 'owner') {
      throw new ForbiddenException('forbidden');
    }

    const userId = this.getUserIdFromReq(req);
    if (!userId) throw new BadRequestException('invalid_user');

    // Reject unknown keys (mass-assignment protection)
    const rawKeys =
      body && typeof body === 'object' ? Object.keys(body as any) : [];
    const unknownKeys = rawKeys.filter((k) => !PATCH_ME_ALLOWLIST.has(k));
    if (unknownKeys.length > 0) {
      throw new BadRequestException('forbidden_fields');
    }

    const profiles = await this.profileService.listForUser(userId);
    const primary = this.pickPrimaryProfile(req, profiles);

    if (!primary?.id) throw new NotFoundException('profile_not_found');

    const safe: PatchMeBody = {};

    if (body && typeof body === 'object') {
      if (typeof body.displayName === 'string') safe.displayName = body.displayName;
      if (body.bio === null || typeof body.bio === 'string') safe.bio = body.bio;
      if (body.avatarUrl === null || typeof body.avatarUrl === 'string')
        safe.avatarUrl = body.avatarUrl;
      if (body.coverUrl === null || typeof body.coverUrl === 'string')
        safe.coverUrl = body.coverUrl;
    }

    // no-op guard
    if (Object.keys(safe).length === 0) {
      throw new BadRequestException('no_fields_to_update');
    }

    const updated = await this.profileService.updateForUser(userId, primary.id, safe);

    // refresh list after update (keeps /profiles/me consistent)
    const refreshed = await this.profileService.listForUser(userId);
    const refreshedPrimary = this.pickPrimaryProfile(req, refreshed);

    return {
      ok: true,
      userId,
      profileId: refreshedPrimary?.id ?? null,
      profile: refreshedPrimary ?? updated,
      profiles: refreshed,
    };
  }

  // ✅ M27.4 — POST /profiles/me/avatar (multipart)
  // buyer/owner only. Upload handled by SpacesUploadService.
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@Req() req: any, @UploadedFile() file?: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    if (role !== 'buyer' && role !== 'owner') {
      throw new ForbiddenException('forbidden');
    }

    const userId = this.getUserIdFromReq(req);
    if (!userId) throw new BadRequestException('invalid_user');

    const profiles = await this.profileService.listForUser(userId);
    const primary = this.pickPrimaryProfile(req, profiles);
    if (!primary?.id) throw new NotFoundException('profile_not_found');

    if (!file || !file.buffer) {
      throw new BadRequestException('file_required');
    }

    const uploaded = await this.spaces.uploadProfileImage({
      userId,
      kind: 'avatar',
      buffer: file.buffer,
      contentType: file.mimetype || '',
    });

    await this.profileService.updateForUser(userId, primary.id, {
      avatarUrl: uploaded.url,
    });

    // return same contract shape as /profiles/me (fresh)
    const refreshed = await this.profileService.listForUser(userId);
    const refreshedPrimary = this.pickPrimaryProfile(req, refreshed);

    return {
      ok: true,
      userId,
      profileId: refreshedPrimary?.id ?? null,
      profile: refreshedPrimary ?? null,
      profiles: refreshed,
      upload: uploaded,
    };
  }

  // ✅ M27.X — POST /profiles/me/cover (multipart)
  // buyer/owner only. Upload handled by SpacesUploadService.
  @UseGuards(JwtAuthGuard)
  @Post('me/cover')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(@Req() req: any, @UploadedFile() file?: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    if (role !== 'buyer' && role !== 'owner') {
      throw new ForbiddenException('forbidden');
    }

    const userId = this.getUserIdFromReq(req);
    if (!userId) throw new BadRequestException('invalid_user');

    const profiles = await this.profileService.listForUser(userId);
    const primary = this.pickPrimaryProfile(req, profiles);
    if (!primary?.id) throw new NotFoundException('profile_not_found');

    if (!file || !file.buffer) {
      throw new BadRequestException('file_required');
    }

    const uploaded = await this.spaces.uploadProfileImage({
      userId,
      kind: 'cover',
      buffer: file.buffer,
      contentType: file.mimetype || '',
    });

    await this.profileService.updateForUser(userId, primary.id, {
      coverUrl: uploaded.url,
    });

    // return same contract shape as /profiles/me (fresh)
    const refreshed = await this.profileService.listForUser(userId);
    const refreshedPrimary = this.pickPrimaryProfile(req, refreshed);

    return {
      ok: true,
      userId,
      profileId: refreshedPrimary?.id ?? null,
      profile: refreshedPrimary ?? null,
      profiles: refreshed,
      upload: uploaded,
    };
  }

  // ✅ FV-21.1 — GET /profiles/public  (PUBLIC DIRECTORY, NO AUTH)
  // owners/creators only + deterministic + whitelist only
  // IMPORTANT: must be above ":slug" routes so "public" doesn't get treated as a slug.
  @Get('public')
  async publicList() {
    return this.profileService.publicList();
  }

  // ✅ FV-19.1 / FV-24 — GET /profiles/:slug/owner-page/public (PUBLIC OWNER PAGE, NO AUTH)
  // Needed for FV-24 parity with /venues/:slug/public
  @Get(':slug/owner-page/public')
  async publicOwnerPage(@Param('slug') slugRaw: string) {
    const slug = String(slugRaw || '').trim();
    return this.profileService.publicOwnerPageBySlug(slug);
  }

  // ✅ FV-16 — GET /profiles/:slug/public (PUBLIC READ, NO AUTH)
  // Slug validation + inactive treated as not found + public whitelist payload
  @Get(':slug/public')
  async publicBySlug(@Req() req: any) {
    const slug = String(req?.params?.slug || '').trim();

    // strict slug rules: non-empty, no spaces, reasonable length
    if (!slug || slug.length < 3 || slug.length > 80 || /\s/.test(slug)) {
      throw new BadRequestException('invalid_slug');
    }

    const profile = await this.profileService.getBySlug(slug);

    // not found OR inactive => 404 (no leakage)
    if (!profile || profile.isActive === false) {
      throw new NotFoundException('profile_not_found');
    }

    return {
      ok: true,
      profile: {
        id: profile.id,
        type: profile.type,
        displayName: profile.displayName,
        slug: profile.slug,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        coverUrl: (profile as any).coverUrl ?? null,
        isActive: profile.isActive,
      },
    };
  }

  // ✅ GET /profiles/:slug (legacy read)
  @Get(':slug')
  async bySlug(@Req() req: any) {
    const slug = String(req?.params?.slug || '').trim();
    const profile = await this.profileService.getBySlug(slug);
    return { ok: true, profile };
  }
}
