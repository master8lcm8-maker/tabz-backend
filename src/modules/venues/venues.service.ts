import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';

import { Venue } from './venue.entity';
import { ProfileService } from '../../profile/profile.service';
import { FreeboardService } from '../freeboard/freeboard.service';
import { VenuePresenceService } from '../venue-presence/venue-presence.service';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    private readonly profileService: ProfileService,
    private readonly freeboardService: FreeboardService,
    private readonly venuePresenceService: VenuePresenceService,
  ) {}

  async publicList() {
    const venues = await this.venueRepo
      .createQueryBuilder('v')
      .where('v.slug IS NOT NULL')
      .andWhere("trim(v.slug) <> ''")
      .andWhere('v.ownerProfileId IS NOT NULL')
      .orderBy('v.id', 'ASC')
      .getMany();

    const enriched = await Promise.all(
      venues.map((v) => this.mapVenueDiscoveryCard(v)),
    );

    return {
      ok: true,
      venues: enriched,
    };
  }

  async searchPublic(q?: string, city?: string) {
    const where: any = {
      slug: ILike('%'),
      ownerProfileId: ILike('%'),
    };

    const query = this.venueRepo.createQueryBuilder('v')
      .where('v.slug IS NOT NULL')
      .andWhere("trim(v.slug) <> ''")
      .andWhere('v.ownerProfileId IS NOT NULL');

    if (q && String(q).trim()) {
      query.andWhere('LOWER(v.name) LIKE LOWER(:q)', {
        q: `%${String(q).trim()}%`,
      });
    }

    if (city && String(city).trim()) {
      query.andWhere('LOWER(v.city) = LOWER(:city)', {
        city: String(city).trim(),
      });
    }

    query.orderBy('v.id', 'ASC');

    const venues = await query.getMany();
    const enriched = await Promise.all(
      venues.map((v) => this.mapVenueDiscoveryCard(v)),
    );

    return {
      ok: true,
      venues: enriched,
    };
  }

  async listActiveVenues() {
    const venues = await this.venueRepo
      .createQueryBuilder('v')
      .where('v.slug IS NOT NULL')
      .andWhere("trim(v.slug) <> ''")
      .andWhere('v.ownerProfileId IS NOT NULL')
      .andWhere('v.isPaused = false')
      .orderBy('v.id', 'ASC')
      .getMany();

    const enriched = await Promise.all(
      venues.map((v) => this.mapVenueDiscoveryCard(v)),
    );

    return {
      ok: true,
      venues: enriched.filter((v) => v.isActiveNow === true),
    };
  }

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

    const ownerPage = await (this.profileService as any).publicOwnerPageBySlug(
      ownerProfile.slug,
    );

    const found = ownerPage?.venues?.some((v: any) => v.slug === venue.slug);

    if (!found) {
      throw new NotFoundException('venue_not_found');
    }

    const discovery = await this.mapVenueDiscoveryCard(venue);

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
        avatarUrl: venue.avatarUrl,
        coverUrl: venue.coverUrl,
        acceptingDrinks: venue.acceptingDrinks,
        acceptingRequests: venue.acceptingRequests,
        acceptingFreeboard: venue.acceptingFreeboard,
        acceptingRedemptions: venue.acceptingRedemptions,
        isPrivate: venue.isPrivate,
        isPaused: venue.isPaused,
        freeboardLight: discovery.freeboardLight,
        activeDropCount: discovery.activeDropCount,
        activeRosterCount: discovery.activeRosterCount,
        isActiveNow: discovery.isActiveNow,
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

    const profiles = await this.profileService.listForUser(ownerId);
    const ownerProfile = profiles.find((p: any) => {
      const t = String(p?.type || '').toLowerCase();
      return (t === 'owner' || t === 'creator') && p?.isActive !== false;
    });

    if (!ownerProfile?.id) {
      throw new BadRequestException('owner_profile_missing');
    }

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

  async updateMedia(
    venueId: number,
    patch: { avatarUrl?: string; coverUrl?: string },
  ): Promise<Venue> {
    const id = Number(venueId);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('invalid_venue_id');
    }

    const venue = await this.venueRepo.findOne({ where: { id } });
    if (!venue) throw new NotFoundException('venue_not_found');

    const nextAvatar = patch?.avatarUrl;
    const nextCover = patch?.coverUrl;

    const avatarProvided = typeof nextAvatar === 'string';
    const coverProvided = typeof nextCover === 'string';

    if (!avatarProvided && !coverProvided) {
      throw new BadRequestException('no_media_fields');
    }

    if (avatarProvided) (venue as any).avatarUrl = nextAvatar;
    if (coverProvided) (venue as any).coverUrl = nextCover;

    return this.venueRepo.save(venue);
  }

  async updateVenueSettings(
    venueId: number,
    patch: Partial<Pick<
      Venue,
      | 'acceptingDrinks'
      | 'acceptingRequests'
      | 'acceptingFreeboard'
      | 'acceptingRedemptions'
      | 'isPrivate'
      | 'isPaused'
    >>,
  ): Promise<Venue> {
    const id = Number(venueId);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('invalid_venue_id');
    }

    const venue = await this.venueRepo.findOne({ where: { id } });
    if (!venue) throw new NotFoundException('venue_not_found');

    if (typeof patch.acceptingDrinks === 'boolean') {
      venue.acceptingDrinks = patch.acceptingDrinks;
    }

    if (typeof patch.acceptingRequests === 'boolean') {
      venue.acceptingRequests = patch.acceptingRequests;
    }

    if (typeof patch.acceptingFreeboard === 'boolean') {
      venue.acceptingFreeboard = patch.acceptingFreeboard;
    }

    if (typeof patch.acceptingRedemptions === 'boolean') {
      venue.acceptingRedemptions = patch.acceptingRedemptions;
    }

    if (typeof patch.isPrivate === 'boolean') {
      venue.isPrivate = patch.isPrivate;
    }

    if (typeof patch.isPaused === 'boolean') {
      venue.isPaused = patch.isPaused;
    }

    return this.venueRepo.save(venue);
  }

  private async mapVenueDiscoveryCard(venue: Venue) {
    const activeDrops = await this.freeboardService.getDropsForVenue(venue.id, venue.ownerId, venue.id, "owner");
    const roster = await this.venuePresenceService.getVenueRoster(venue.id);

    const activeDropCount = Array.isArray(activeDrops) ? activeDrops.length : 0;
    const activeRosterCount = Array.isArray(roster) ? roster.length : 0;

    return {
      id: venue.id,
      slug: venue.slug,
      name: venue.name,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      avatarUrl: venue.avatarUrl,
      coverUrl: venue.coverUrl,
      acceptingDrinks: venue.acceptingDrinks,
      acceptingRequests: venue.acceptingRequests,
      acceptingFreeboard: venue.acceptingFreeboard,
      acceptingRedemptions: venue.acceptingRedemptions,
      isPrivate: venue.isPrivate,
      isPaused: venue.isPaused,
      activeDropCount,
      activeRosterCount,
      freeboardLight: activeDropCount > 0 ? 'green' : 'grey',
      isActiveNow: activeDropCount > 0 || activeRosterCount > 0,
    };
  }

  private slugify(input: string): string {
    const s = String(input || '')
      .toLowerCase()
      .trim()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return s.slice(0, 120);
  }

  private async makeUniqueSlug(base: string): Promise<string> {
    let slug = base.slice(0, 120);

    const exists = async (s: string) =>
      (await this.venueRepo.count({ where: { slug: s } })) > 0;

    if (!(await exists(slug))) return slug;

    const suffix = `-${Date.now()}`;
    const maxBaseLen = 120 - suffix.length;
    slug = `${base.slice(0, Math.max(1, maxBaseLen))}${suffix}`;

    if (!(await exists(slug))) return slug;

    const suffix2 = `-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const maxBaseLen2 = 120 - suffix2.length;
    return `${base.slice(0, Math.max(1, maxBaseLen2))}${suffix2}`;
  }
}
