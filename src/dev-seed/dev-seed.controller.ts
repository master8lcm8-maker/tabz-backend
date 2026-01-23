// src/dev-seed/dev-seed.controller.ts
import {
  Controller,
  Post,
  InternalServerErrorException,
  Req,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { DevEndpointGuard } from '../app/dev-endpoint.guard';
import { DataSource, IsNull, Repository } from 'typeorm';
import { UsersService } from '../modules/users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Staff } from '../modules/staff/staff.entity';
import * as bcrypt from 'bcrypt';

import { ProfileService } from '../profile/profile.service';
import { ProfileType } from '../profile/profile.types';
import { Venue } from '../modules/venues/venue.entity';

// ✅ ADD
import { StoreItemsService } from '../modules/store-items/store-items.service';

@UseGuards(DevEndpointGuard)
@Controller('dev-seed')
export class DevSeedController {
  private toSlug(input: string, fallback: string) {
    const s = String(input || '')
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s || fallback;
  }

  constructor(
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,

    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,

    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,

    private readonly profileService: ProfileService,

    // ✅ ADD (comes from StoreItemsModule)
    private readonly storeItemsService: StoreItemsService,
  ) {}

  // ------------------------------------------------------------
  // 🔒 Dev-seed access gate (minimal + explicit)
  // ------------------------------------------------------------
  private assertDevSeedAllowed(req: any) {
    const secret = String(process.env.DEV_SEED_SECRET || '').trim();

    // R5 instrumentation (safe): presence + length only (never log the value)
    console.log('[DEV_SEED]', {
      present: !!secret,
      len: secret ? secret.length : 0,
    });

    if (!secret) {
      throw new UnauthorizedException('dev_seed_secret_missing');
    }

    const provided = String(req?.headers?.['x-dev-seed-secret'] || '').trim();
    if (!provided || provided !== secret) {
      throw new UnauthorizedException('dev_seed_forbidden');
    }
  }

  // ------------------------------------------------------------
  // Helper: create user if missing
  // ------------------------------------------------------------
  private async ensureUser(params: {
    email: string;
    password: string;
    displayName: string;
  }) {
    const existing = await this.usersService.findByEmail?.(params.email);
    if (existing) return existing;

    const createFn: any =
      (this.usersService as any).createUser ??
      (this.usersService as any).create ??
      (this.usersService as any).createDemoUser ??
      (this.usersService as any).createWithPassword;

    if (typeof createFn !== 'function') {
      throw new InternalServerErrorException(
        'UsersService is missing a create method.',
      );
    }

    try {
      return await createFn.call(
        this.usersService,
        params.email,
        params.password,
        params.displayName,
      );
    } catch {
      return await createFn.call(this.usersService, {
        email: params.email,
        password: params.password,
        displayName: params.displayName,
      });
    }
  }

  // ------------------------------------------------------------
  // Helper: ensure profile exists (idempotent)
  // ------------------------------------------------------------
  private async ensureProfile(params: {
    userId: number;
    displayName: string;
    type: ProfileType;
  }) {
    const userId = Number(params.userId);
    if (!Number.isFinite(userId) || userId <= 0) return null;

    const existing = await this.profileService.listForUser(userId);
    const found = existing?.find((p: any) => String(p?.type) === params.type);
    if (found) return found;

    const typeStr = String(params.type).toLowerCase();
    const slug = `${typeStr}-${userId}`;

    return this.profileService.createForUser(userId, {
      type: params.type,
      displayName: params.displayName,
      slug,
      bio: null,
      avatarUrl: null,
    });
  }

  // ------------------------------------------------------------
  // Helper: ensure owner venue exists and is linked to profile
  // ------------------------------------------------------------
  private async ensureOwnerVenueLink(params: {
    ownerUserId: number;
    ownerProfileId: number;
    venueName: string;
  }): Promise<Venue> {
    const { ownerUserId, ownerProfileId, venueName } = params;

    let venue = await this.venueRepo.findOne({
      where: { ownerId: ownerUserId },
    });

    if (!venue) {
      const slug = this.toSlug(venueName, 'venue-' + ownerUserId);
      venue = this.venueRepo.create({
        ownerId: ownerUserId,
        ownerProfileId,
        name: venueName,
        slug,
        address: null,
        city: null,
        state: null,
        country: 'US',
      });
      return await this.venueRepo.save(venue);
    }

    // Backfill missing slug (prevents any legacy null-slug venue from breaking downstream logic)
    if (!venue.slug) {
      venue.slug = this.toSlug(venue.name, 'venue-' + ownerUserId);
      venue = await this.venueRepo.save(venue);
    }

    if (!venue.ownerProfileId) {
      venue.ownerProfileId = ownerProfileId;
      venue = await this.venueRepo.save(venue);
    }

    return venue;
  }

  // ------------------------------------------------------------
  // Helper: get a real venue id for staff seeding (no FK roulette)
  // ------------------------------------------------------------
  private async ensureVenueForStaff(req: any): Promise<Venue> {
    // Make sure owner user + owner profile + venue exist (idempotent)
    const ownerEmail = 'owner@tabz.app';
    const ownerPassword = 'password';
    const ownerDisplayName = 'Demo Owner';

    const ownerUser = await this.ensureUser({
      email: ownerEmail,
      password: ownerPassword,
      displayName: ownerDisplayName,
    });

    if (!ownerUser?.id) {
      throw new InternalServerErrorException('owner_user_missing_id');
    }

    const ownerProfile = await this.ensureProfile({
      userId: ownerUser.id,
      displayName: ownerDisplayName,
      type: ProfileType.OWNER,
    });

    if (!ownerProfile?.id) {
      throw new InternalServerErrorException('owner_profile_missing_id');
    }

    // Ensure venue exists for that owner (this is the venue staff should FK to)
    let venue = await this.ensureOwnerVenueLink({
      ownerUserId: ownerUser.id,
      ownerProfileId: ownerProfile.id,
      venueName: 'Demo Venue',
    });

    // Absolute sanity check: if the venue still doesn't have an id, abort loudly
    const venueId = Number((venue as any)?.id);
    if (!Number.isFinite(venueId) || venueId <= 0) {
      throw new InternalServerErrorException('venue_missing_id_after_ensure');
    }

    // Re-fetch to ensure it's actually persisted and FK-visible
    const persisted = await this.venueRepo.findOne({ where: { id: venueId as any } });
    if (!persisted?.id) {
      throw new InternalServerErrorException('venue_not_persisted');
    }

    // Backfill slug if needed
    if (!persisted.slug) {
      persisted.slug = this.toSlug(persisted.name, 'venue-' + ownerUser.id);
      venue = await this.venueRepo.save(persisted);
      return venue;
    }

    return persisted;
  }

  // ------------------------------------------------------------
  // BUYER seed
  // ------------------------------------------------------------
  @Post('buyer')
  async seedBuyer(@Req() req: any) {
    this.assertDevSeedAllowed(req);

    const email = 'buyer@tabz.app';
    const password = 'password';
    const displayName = 'Demo Buyer';

    const user = await this.ensureUser({ email, password, displayName });

    if (user?.id) {
      await this.ensureProfile({
        userId: user.id,
        displayName,
        type: ProfileType.BUYER,
      });
    }

    return { ok: true, createdOrExists: true, email, userId: user?.id ?? null };
  }

  // ------------------------------------------------------------
  // OWNER seed
  // ------------------------------------------------------------
  @Post('owner')
  async seedOwner(@Req() req: any) {
    this.assertDevSeedAllowed(req);

    const email = 'owner@tabz.app';
    const password = 'password';
    const displayName = 'Demo Owner';

    const user = await this.ensureUser({ email, password, displayName });

    if (user?.id) {
      const profile = await this.ensureProfile({
        userId: user.id,
        displayName,
        type: ProfileType.OWNER,
      });

      if (profile?.id) {
        await this.ensureOwnerVenueLink({
          ownerUserId: user.id,
          ownerProfileId: profile.id,
          venueName: 'Demo Venue',
        });
      }
    }

    return { ok: true, createdOrExists: true, email, userId: user?.id ?? null };
  }

  // ------------------------------------------------------------
  // OWNER2 seed
  // ------------------------------------------------------------
  @Post('owner2')
  async seedOwner2(@Req() req: any) {
    this.assertDevSeedAllowed(req);

    const email = 'owner2@tabz.app';
    const password = 'password';
    const displayName = 'Demo Owner 2';

    const user = await this.ensureUser({ email, password, displayName });

    if (user?.id) {
      const profile = await this.ensureProfile({
        userId: user.id,
        displayName,
        type: ProfileType.OWNER,
      });

      if (profile?.id) {
        await this.ensureOwnerVenueLink({
          ownerUserId: user.id,
          ownerProfileId: profile.id,
          venueName: 'Demo Venue 2',
        });
      }
    }

    return { ok: true, createdOrExists: true, email, userId: user?.id ?? null };
  }

  // ------------------------------------------------------------
  // STAFF seed
  // ------------------------------------------------------------
  @Post('staff')
  async seedStaff(@Req() req: any) {
    this.assertDevSeedAllowed(req);

    const email = 'staff@tabz.app';
    const password = 'password'; // ✅ match proofs
    const name = 'Demo Staff';

    // ✅ Fix: never pick "first venue" (can point at legacy/bad rows).
    // Always seed/ensure the real owner venue and FK to that.
    const venue = await this.ensureVenueForStaff(req);
    if (!venue?.id) {
      throw new BadRequestException('no_venue_for_staff');
    }
    const venueId = Number((venue as any).id);

    const user = await this.ensureUser({
      email,
      password,
      displayName: name,
    });

    if (user?.id) {
      await this.ensureProfile({
        userId: user.id,
        displayName: name,
        type: ProfileType.STAFF,
      });
    }

    let staff = await this.staffRepo.findOne({ where: { email } });
    const passwordHash = await bcrypt.hash(password, 10);

    if (!staff) {
      staff = this.staffRepo.create({
        email,
        name,
        venueId,
        passwordHash,
      });
    } else {
      staff.venueId = venueId;
      staff.name = name;
      staff.passwordHash = passwordHash;
    }

    staff = await this.staffRepo.save(staff);

    return {
      ok: true,
      createdOrExists: true,
      email,
      venueId,
      staffId: staff.id,
      userId: user?.id ?? null,
    };
  }

  // ------------------------------------------------------------
  // ✅ MILESTONE 8 helper: ensure owner venue + a store item exists
  // POST /dev-seed/owner-item
  //
  // Returns: { ok, venueId, venue, item }
  // Idempotent: reuses existing venue + first existing item for venue
  // ------------------------------------------------------------
  @Post('owner-item')
  async seedOwnerVenueAndItem(@Req() req: any) {
    this.assertDevSeedAllowed(req);

    // Ensure owner + venue exists
    await this.seedOwner(req);

    const ownerEmail = 'owner@tabz.app';
    const ownerUser = await this.usersService.findByEmail?.(ownerEmail);
    const ownerId = Number(ownerUser?.id);

    if (!ownerId || ownerId <= 0) {
      throw new BadRequestException('owner_user_missing');
    }

    const venue = await this.venueRepo.findOne({ where: { ownerId } });
    if (!venue?.id) {
      throw new BadRequestException('owner_venue_missing');
    }

    // Backfill slug if legacy venue exists with null slug
    if (!venue.slug) {
      venue.slug = this.toSlug(venue.name, 'venue-' + ownerId);
      await this.venueRepo.save(venue);
    }

    // Idempotent item: reuse an existing item if present
    const items = await this.storeItemsService.getItemsForVenue(venue.id);
    let item = items?.[0];

    if (!item) {
      item = await this.storeItemsService.createItemForVenue(
        venue.id,
        'Demo Item',
        500, // priceCents
      );
    }

    return {
      ok: true,
      venueId: venue.id,
      venue,
      item,
    };
  }

  // ------------------------------------------------------------
  // LEGACY FIX: backfill venues.ownerProfileId for any nulls
  // ------------------------------------------------------------
  @Post('venues/backfill-owner-profile-id')
  async backfillVenueOwnerProfileIds(@Req() req: any) {
    this.assertDevSeedAllowed(req);

    const legacyVenues = await this.venueRepo.find({
      where: { ownerProfileId: IsNull() },
    });

    if (!legacyVenues.length) {
      return {
        ok: true,
        legacyCount: 0,
        fixedVenues: [],
        message: 'No venues missing ownerProfileId.',
      };
    }

    const ownerIds = Array.from(
      new Set(
        legacyVenues
          .map((v) => Number(v.ownerId))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );

    const fixedVenueIds: number[] = [];
    const updatedVenues: Array<{
      venueId: number;
      ownerId: number;
      ownerProfileId: number;
      name: string;
    }> = [];

    for (const ownerId of ownerIds) {
      let displayName = `Legacy Owner ${ownerId}`;
      try {
        const user = await this.usersService.findOneById(ownerId);

        if (user?.displayName) displayName = String(user.displayName);
        else if (user?.email) displayName = `Legacy ${String(user.email)}`;
      } catch {}

      const profile = await this.ensureProfile({
        userId: ownerId,
        displayName,
        type: ProfileType.OWNER,
      });

      if (!profile?.id) continue;

      const toFix = legacyVenues.filter((v) => Number(v.ownerId) === ownerId);
      for (const v of toFix) {
        v.ownerProfileId = profile.id;

        // Also backfill slug if needed
        if (!v.slug) {
          v.slug = this.toSlug(v.name, 'venue-' + ownerId);
        }

        await this.venueRepo.save(v);

        fixedVenueIds.push(v.id);
        updatedVenues.push({
          venueId: v.id,
          ownerId: ownerId,
          ownerProfileId: profile.id,
          name: v.name,
        });
      }
    }

    return {
      ok: true,
      legacyCount: legacyVenues.length,
      fixedCount: fixedVenueIds.length,
      fixedVenues: updatedVenues,
    };
  }

  // ------------------------------------------------------------
  // Read-only list
  // ------------------------------------------------------------
  @Post('venues')
  async listVenues(@Req() req: any) {
    this.assertDevSeedAllowed(req);

    const venues = await this.venueRepo.find({ order: { id: 'ASC' as any } });
    return { ok: true, count: venues.length, venues };
  }

  // ------------------------------------------------------------
  // Seed everything
  // ------------------------------------------------------------
  @Post('all')
  async seedAll(@Req() req: any) {
    this.assertDevSeedAllowed(req);

    const buyer = await this.seedBuyer(req);
    const owner = await this.seedOwner(req);
    const owner2 = await this.seedOwner2(req);
    const staff = await this.seedStaff(req);

    return { ok: true, buyer, owner, owner2, staff };
  }
}
