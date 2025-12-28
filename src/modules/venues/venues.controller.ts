// src/modules/venues/venues.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VenuesService } from './venues.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  // POST /venues  -> create a venue owned by the logged-in user
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

  // GET /venues/mine  -> venues for the logged-in owner
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

  // GET /venues  -> optional, all venues
  @Get()
  async all() {
    const venues = await this.venuesService.findAll();

    return {
      value: venues,
      Count: venues.length,
    };
  }
}
