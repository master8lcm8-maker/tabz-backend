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
  ) {}

  // ----------------------------
  // READS
  // ----------------------------
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
  // WRITE
  // ----------------------------
  async createForUser(userId: number, input: CreateProfileInput): Promise<Profile> {
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
      isActive: true,
    });

    return this.profileRepo.save(p);
  }

  async deactivateForUser(userId: number, profileId: number): Promise<Profile> {
    const p = await this.getByIdForUser(userId, profileId);
    if (!p.isActive) return p;

    p.isActive = false;
    return this.profileRepo.save(p);
  }
}
