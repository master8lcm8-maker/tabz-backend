import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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

  @Get('public')
  async publicList() {
    return this.venuesService.publicList();
  }

  @Get('search')
  async searchPublic(
    @Query('q') q?: string,
    @Query('city') city?: string,
  ) {
    return this.venuesService.searchPublic(q, city);
  }

  @Get('active')
  async activeVenues() {
    return this.venuesService.listActiveVenues();
  }

  @Get(':slug/public')
  async publicVenue(@Param('slug') slug: string) {
    return this.venuesService.publicBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: any, @Body() body: any) {
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

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async mine(@Req() req: any) {
    const ownerId = req.user?.sub;
    const venues = await this.venuesService.findByOwner(ownerId);

    return {
      value: venues,
      Count: venues.length,
    };
  }

  @Get()
  async all() {
    const venues = await this.venuesService.findAll();

    return {
      value: venues,
      Count: venues.length,
    };
  }

  @Post(':id/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file?: any,
  ) {
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
