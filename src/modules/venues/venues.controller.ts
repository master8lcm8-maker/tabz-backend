import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { VenuesService } from './venues.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateVenueDto {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createVenue(@Req() req: any, @Body() dto: CreateVenueDto) {
    // JwtStrategy puts { userId, email } into req.user
    const ownerId = req.user.userId;

    const venue = await this.venuesService.createVenue(ownerId, {
      name: dto.name,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      country: dto.country,
    });

    return {
      id: venue.id,
      name: venue.name,
      address: venue.address,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      ownerId: venue.ownerId,
      createdAt: venue.createdAt,
    };
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyVenues(@Req() req: any) {
    const ownerId = req.user.userId;

    const venues = await this.venuesService.findVenuesByOwner(ownerId);

    return venues.map((v) => ({
      id: v.id,
      name: v.name,
      address: v.address,
      city: v.city,
      state: v.state,
      country: v.country,
      createdAt: v.createdAt,
    }));
  }
}
