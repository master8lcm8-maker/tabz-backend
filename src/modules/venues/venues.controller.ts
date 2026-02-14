// src/modules/venues/venues.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { VenuesService } from './venues.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpacesUploadService } from '../../storage/spaces-upload.service';

@Controller('venues')
export class VenuesController {
  constructor(
    private readonly venuesService: VenuesService,
    private readonly spaces: SpacesUploadService,
  ) {}

  // --------------------------------------------------
  // Auth/role gate: Venues owner-only for private routes
  // --------------------------------------------------
  private assertOwnerOnly(req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    if (!role) throw new ForbiddenException('forbidden_role');
    if (role !== 'owner') throw new ForbiddenException('owner_only');
  }

  // ✅ FV-20.1.A — GET /venues/public (PUBLIC DIRECTORY, NO AUTH)
  @Get('public')
  async publicList() {
    return this.venuesService.publicList();
  }

  // ✅ FV-20.1.B — GET /venues/:slug/public (PUBLIC VENUE PAGE, NO AUTH)
  @Get(':slug/public')
  async publicVenue(@Param('slug') slug: string) {
    return this.venuesService.publicBySlug(slug);
  }

  // POST /venues -> create a venue owned by the logged-in user
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: any, @Body() body: any) {
    this.assertOwnerOnly(req);
    const ownerId = req.user?.sub;

    const venue = await this.venuesService.create({
      name: body.name,
      address: body.address,
      city: body.city ?? null,
      state: body.state ?? null,
      country: body.country ?? null,
      ownerId,
    });

    return venue;
  }

  // GET /venues/mine -> venues for the logged-in owner
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async mine(@Req() req: any) {
    this.assertOwnerOnly(req);
    const ownerId = req.user?.sub;
    const venues = await this.venuesService.findByOwner(ownerId);

    return {
      value: venues,
      Count: venues.length,
    };
  }

  // GET /venues -> OWNER-ONLY (avoid cross-role bleed)
  @Get()
  @UseGuards(JwtAuthGuard)
  async all(@Req() req: any) {
    this.assertOwnerOnly(req);

    const venues = await this.venuesService.findAll();
    return {
      value: venues,
      Count: venues.length,
    };
  }

  // ============================
  // FV-25 — VENUE MEDIA UPLOADS
  // ============================

  @Post(':id/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file?: any,
  ) {
    this.assertOwnerOnly(req);

    const venueId = Number(id);
    const ownerId = req.user?.sub;

    if (!venueId || !ownerId) {
      throw new ForbiddenException('forbidden');
    }

    const venues = await this.venuesService.findByOwner(ownerId);
    const venue = venues.find((v) => v.id === venueId);
    if (!venue) throw new NotFoundException('venue_not_found');

    if (!file || !file.buffer) {
      throw new ForbiddenException('file_required');
    }

    const uploaded = await this.spaces.uploadProfileImage({
      userId: ownerId,
      kind: 'avatar',
      buffer: file.buffer,
      contentType: file.mimetype || '',
    });

    const updated = await this.venuesService.updateMedia(venueId, {
      avatarUrl: uploaded.url,
    });

    return {
      ok: true,
      venue: updated,
      upload: uploaded,
    };
  }

  @Post(':id/cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file?: any,
  ) {
    this.assertOwnerOnly(req);

    const venueId = Number(id);
    const ownerId = req.user?.sub;

    if (!venueId || !ownerId) {
      throw new ForbiddenException('forbidden');
    }

    const venues = await this.venuesService.findByOwner(ownerId);
    const venue = venues.find((v) => v.id === venueId);
    if (!venue) throw new NotFoundException('venue_not_found');

    if (!file || !file.buffer) {
      throw new ForbiddenException('file_required');
    }

    const uploaded = await this.spaces.uploadProfileImage({
      userId: ownerId,
      kind: 'cover',
      buffer: file.buffer,
      contentType: file.mimetype || '',
    });

    const updated = await this.venuesService.updateMedia(venueId, {
      coverUrl: uploaded.url,
    });

    return {
      ok: true,
      venue: updated,
      upload: uploaded,
    };
  }
}
