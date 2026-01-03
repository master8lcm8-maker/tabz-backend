// src/modules/venues/venues.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Venue } from './venue.entity';
import { ProfileService } from '../../profile/profile.service';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    private readonly profileService: ProfileService,
  ) {}

  // ----------------------------
  // FV-20.1.A / FV-20.2 — PUBLIC DIRECTORY LIST
  // ----------------------------
  async publicList() {
    const venues = await this.venueRepo
      .createQueryBuilder('v')
      .where('v.slug IS NOT NULL')
      .andWhere("trim(v.slug) <> ''")
      .andWhere('v.ownerProfileId IS NOT NULL')
      .orderBy('v.id', 'ASC')
      .getMany();

    return {
      ok: true,
      venues: venues.map((v) => ({
        id: v.id,
        slug: v.slug,
        name: v.name,
        city: v.city,
        state: v.state,
        country: v.country,
      })),
    };
  }

  // ----------------------------
  // FV-24 — PUBLIC VENUE PAGE WITH OWNER-PAGE PARITY
  // ----------------------------
  async publicBySlug(slugRaw: string) {
    const slug = String(slugRaw || '').trim();

    if (!slug || slug.length < 3 || slug.length > 120 || /\s/.test(slug)) {
      throw new BadRequestException('invalid_slug');
    }

    const venue = await this.venueRepo.findOne({ where: { slug } });
    if (!venue) throw new NotFoundException('venue_not_found');

    if (!venue.slug || !venue.ownerProfileId) {
      throw new NotFoundException('venue_not_found');
    }

    // owner profile must exist + be public-eligible
    const ownerProfile: any = await (this.profileService as any).getById(
      venue.ownerProfileId,
    );

    const t = String(ownerProfile?.type || '').toLowerCase();
    if (
      !ownerProfile ||
      ownerProfile.isActive === false ||
      (t !== 'owner' && t !== 'creator')
    ) {
      throw new NotFoundException('venue_not_found');
    }

    // ----------------------------
    // FV-24 PARITY CHECK (CRITICAL)
    // Venue MUST appear on owner's public owner-page
    // ----------------------------
    const ownerPage = await (this.profileService as any).publicOwnerPageBySlug(
      ownerProfile.slug,
    );

    const found = ownerPage?.venues?.some((v: any) => v.slug === venue.slug);

    if (!found) {
      throw new NotFoundException('venue_not_found');
    }

    return {
      ok: true,
      venue: {
        id: venue.id,
        slug: venue.slug,
        name: venue.name,
        address: venue.address,
        city: venue.city,
        state: venue.state,
        country: venue.country,
      },
      ownerProfile: {
        id: ownerProfile.id,
        type: ownerProfile.type,
        displayName: ownerProfile.displayName,
        slug: ownerProfile.slug,
        bio: ownerProfile.bio,
        avatarUrl: ownerProfile.avatarUrl,
        isActive: ownerProfile.isActive,
      },
    };
  }

  // ----------------------------
  // WRITE / INTERNAL
  // ----------------------------
  async create(dto: {
    name: string;
    address: string;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    ownerId: number;
  }): Promise<Venue> {
    const { name, address, city, state, country, ownerId } = dto;

    if (!ownerId) throw new BadRequestException('ownerId_is_required');
    if (!name || !address) {
      throw new BadRequestException('name_and_address_are_required');
    }

    // ✅ MUST: determine ownerProfileId (public venues depend on it)
    const profiles = await this.profileService.listForUser(ownerId);
    const ownerProfile = profiles.find((p: any) => {
      const t = String(p?.type || '').toLowerCase();
      return (t === 'owner' || t === 'creator') && p?.isActive !== false;
    });

    if (!ownerProfile?.id) {
      throw new BadRequestException('owner_profile_missing');
    }

    // ✅ MUST: generate a slug so /venues/:slug/public can work
    const baseSlug = this.slugify(name);
    if (!baseSlug) throw new BadRequestException('invalid_venue_name');

    const slug = await this.makeUniqueSlug(baseSlug);

    const venue = this.venueRepo.create({
      name: name.trim(),
      address: address.trim(),
      city: city ?? null,
      state: state ?? null,
      country: country ?? null,
      ownerId,
      ownerProfileId: ownerProfile.id,
      slug,
    });

    return this.venueRepo.save(venue);
  }

  async findByOwner(ownerId: number): Promise<Venue[]> {
    if (!ownerId) return [];
    return this.venueRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Venue[]> {
    return this.venueRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  // ----------------------------
  // helpers
  // ----------------------------
  private slugify(input: string): string {
    const s = String(input || '')
      .toLowerCase()
      .trim()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    // hard cap to DB column length (120)
    return s.slice(0, 120);
  }

  private async makeUniqueSlug(base: string): Promise<string> {
    let slug = base.slice(0, 120);

    const exists = async (s: string) =>
      (await this.venueRepo.count({ where: { slug: s } })) > 0;

    if (!(await exists(slug))) return slug;

    // append deterministic-ish suffix; keep under 120
    const suffix = `-${Date.now()}`;
    const maxBaseLen = 120 - suffix.length;
    slug = `${base.slice(0, Math.max(1, maxBaseLen))}${suffix}`;

    // extremely unlikely collision, but safe:
    if (!(await exists(slug))) return slug;

    const suffix2 = `-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const maxBaseLen2 = 120 - suffix2.length;
    return `${base.slice(0, Math.max(1, maxBaseLen2))}${suffix2}`;
  }
}
