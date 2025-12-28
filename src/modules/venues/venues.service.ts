// src/modules/venues/venues.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './venue.entity';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
  ) {}

  /**
   * Create a venue owned by a specific user.
   */
  async create(dto: {
    name: string;
    address: string;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    ownerId: number;
  }): Promise<Venue> {
    const { name, address, city, state, country, ownerId } = dto;

    if (!ownerId) {
      throw new BadRequestException('ownerId is required');
    }
    if (!name || !address) {
      throw new BadRequestException('name and address are required');
    }

    const venue = this.venueRepo.create({
      name,
      address,
      city: city ?? null,
      state: state ?? null,
      country: country ?? null,
      ownerId,
    });

    return this.venueRepo.save(venue);
  }

  /**
   * All venues for a specific owner.
   */
  async findByOwner(ownerId: number): Promise<Venue[]> {
    if (!ownerId) return [];

    return this.venueRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Optional: list all venues (no filter).
   */
  async findAll(): Promise<Venue[]> {
    return this.venueRepo.find({
      order: { createdAt: 'DESC' },
    });
  }
}
