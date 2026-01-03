// src/profile/profile.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Profile } from './profile.entity';
import { ProfileType } from './profile.types';

// ✅ ADD (already in your file for FV-19)
import { Venue } from '../modules/venues/venue.entity';

type CreateProfileInput = {
  type: ProfileType;
  displayName: string;
  slug: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,

    // ✅ already present in your file (FV-19)
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
  ) {}

  // ----------------------------
  // READS
  // ----------------------------
  async getById(profileId: number): Promise<Profile> {
    const id = Number(profileId);
    if (!id) throw new BadRequestException('Invalid profileId');

    const p = await this.profileRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Profile not found');
    return p;
  }

  async getByIdForUser(userId: number, profileId: number): Promise<Profile> {
    const p = await this.profileRepo.findOne({
      where: { id: profileId, userId },
    });
    if (!p) throw new NotFoundException('Profile not found');
    return p;
  }

  async getBySlug(slug: string): Promise<Profile> {
    const s = String(slug || '').trim();
    if (!s) throw new BadRequestException('Invalid slug');

    const p = await this.profileRepo.findOne({ where: { slug: s } });
    if (!p) throw new NotFoundException('Profile not found');
    return p;
  }

  async listForUser(userId: number): Promise<Profile[]> {
    return this.profileRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // ----------------------------
  // FV-21.1 — PUBLIC PROFILES DIRECTORY
  // ----------------------------
  async publicList() {
    // deterministic: id ASC
    const profiles = await this.profileRepo.find({
      where: { isActive: true } as any,
      order: { id: 'ASC' as any },
    });

    // filter: owner/creator only + slug must exist and be non-empty (prevents junk rows)
    const filtered = (profiles || []).filter((p: any) => {
      const t = String(p?.type || '').toLowerCase();
      const allowed = t === 'owner' || t === 'creator';
      const slug = String(p?.slug || '').trim();
      return allowed && !!slug;
    });

    return {
      ok: true,
      profiles: filtered.map((p: any) => ({
        id: p.id,
        type: p.type,
        displayName: p.displayName,
        slug: p.slug,
        bio: p.bio,
        avatarUrl: p.avatarUrl,
        coverUrl: (p as any).coverUrl ?? null, // ✅ PUBLIC
        isActive: p.isActive,
      })),
    };
  }

  // ----------------------------
  // FV-19.1 — PUBLIC OWNER PAGE
  // ----------------------------
  async publicOwnerPageBySlug(slugRaw: string) {
    const slug = String(slugRaw || '').trim();

    // strict slug rules: non-empty, no spaces, reasonable length
    if (!slug || slug.length < 3 || slug.length > 80 || /\s/.test(slug)) {
      throw new BadRequestException('invalid_slug');
    }

    const profile = await this.profileRepo.findOne({ where: { slug } });

    // not found OR inactive => 404 (no leakage)
    if (!profile || profile.isActive === false) {
      throw new NotFoundException('profile_not_found');
    }

    const t = String(profile.type || '').toLowerCase();
    const allowed = t === 'owner' || t === 'creator';
    if (!allowed) {
      // buyer/staff must not have public owner pages
      throw new NotFoundException('profile_not_found');
    }

    // ✅ FV-19.2 hardening: filter out bad venue rows (null/empty slug)
    const venues = await this.venueRepo.find({
      where: { ownerProfileId: profile.id } as any,
      order: { id: 'ASC' as any }, // deterministic
    });

    const safeVenues = (venues || []).filter((v: any) => {
      const s = String(v?.slug || '').trim();
      return !!s; // filters null/empty/whitespace
    });

    return {
      ok: true,
      ownerProfile: {
        id: profile.id,
        type: profile.type,
        displayName: profile.displayName,
        slug: profile.slug,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        coverUrl: (profile as any).coverUrl ?? null, // ✅ PUBLIC
        isActive: profile.isActive,
      },
      venues: safeVenues.map((v: any) => ({
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
  // WRITE
  // ----------------------------
  async createForUser(
    userId: number,
    input: CreateProfileInput,
  ): Promise<Profile> {
    const displayName = String(input?.displayName || '').trim();
    const slug = String(input?.slug || '').trim().toLowerCase();
    const type = input?.type;

    if (!displayName) throw new BadRequestException('displayName is required');
    if (!slug) throw new BadRequestException('slug is required');
    if (!type) throw new BadRequestException('type is required');

    // Lightweight slug guard (no regex wars yet)
    if (slug.length < 3 || slug.length > 160) {
      throw new BadRequestException('slug length invalid');
    }

    // Enforce uniqueness by lookup first (still keep DB unique index)
    const existing = await this.profileRepo.findOne({ where: { slug } });
    if (existing) throw new ConflictException('slug already in use');

    const p = this.profileRepo.create({
      userId,
      type,
      displayName,
      slug,
      bio: input?.bio ?? null,
      avatarUrl: input?.avatarUrl ?? null,
      // coverUrl optional; set via update
      isActive: true,
    });

    return this.profileRepo.save(p);
  }

  async updateForUser(
    userId: number,
    profileId: number,
    patch: {
      displayName?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      coverUrl?: string | null;
    },
  ): Promise<Profile> {
    const pid = Number(profileId);
    if (!pid) throw new BadRequestException('Invalid profileId');

    const p = await this.profileRepo.findOne({ where: { id: pid, userId } });
    if (!p) throw new NotFoundException('Profile not found');

    // ✅ only allow a controlled set of fields
    if (patch.displayName !== undefined) {
      const dn = String(patch.displayName || '').trim();
      if (!dn) throw new BadRequestException('displayName is required');
      if (dn.length > 120) throw new BadRequestException('displayName too long');
      p.displayName = dn;
    }

    if (patch.bio !== undefined) {
      if (patch.bio === null) p.bio = null;
      else p.bio = String(patch.bio).trim();
    }

    if (patch.avatarUrl !== undefined) {
      if (patch.avatarUrl === null) p.avatarUrl = null;
      else p.avatarUrl = String(patch.avatarUrl).trim();
    }

    if (patch.coverUrl !== undefined) {
      // NOTE: Profile entity might not be typed with coverUrl yet; keep safe
      if (patch.coverUrl === null) (p as any).coverUrl = null;
      else (p as any).coverUrl = String(patch.coverUrl).trim();
    }

    return this.profileRepo.save(p);
  }

  async deactivateForUser(userId: number, profileId: number): Promise<Profile> {
    const p = await this.getByIdForUser(userId, profileId);
    if (!p.isActive) return p;

    p.isActive = false;
    return this.profileRepo.save(p);
  }
}
