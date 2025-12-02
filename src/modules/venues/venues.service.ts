import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './venue.entity';

interface CreateVenueParams {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venuesRepo: Repository<Venue>,
  ) {}

  async createVenue(ownerId: number, data: CreateVenueParams): Promise<Venue> {
    const venue = this.venuesRepo.create({
      ownerId,
      ...data,
    });

    return this.venuesRepo.save(venue);
  }

  async findVenuesByOwner(ownerId: number): Promise<Venue[]> {
    return this.venuesRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }
}
