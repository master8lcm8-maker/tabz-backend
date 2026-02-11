/* eslint-disable @typescript-eslint/no-explicit-any */
// src/modules/freeboard/freeboard.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { FreeboardDrop, FreeboardDropStatus } from './freeboard-drop.entity';
import { randomBytes } from 'crypto';

type CreateDropArgs = {
  creatorId: number;
  venueId: number;
  title: string;
  description?: string;
  rewardCents?: number;
  expiresInMinutes?: number;
};

type ClaimDropArgs = {
  userId: number;
  code: string;
};

@Injectable()
export class FreeboardService {
  constructor(
    @InjectRepository(FreeboardDrop)
    private readonly dropsRepo: Repository<FreeboardDrop>,
  ) {}

  async createDrop(args: CreateDropArgs): Promise<FreeboardDrop> {
    const {
      creatorId,
      venueId,
      title,
      description,
      rewardCents,
      expiresInMinutes,
    } = args;

    if (!creatorId || Number.isNaN(Number(creatorId))) {
      throw new BadRequestException('creatorId is required.');
    }
    if (!venueId || Number.isNaN(Number(venueId))) {
      throw new BadRequestException('venueId is required.');
    }
    if (!title || !title.trim()) {
      throw new BadRequestException('Title is required for a drop.');
    }

    const ttl = Number(expiresInMinutes ?? 60);
    const ttlSafe = Number.isFinite(ttl) && ttl > 0 ? ttl : 60;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSafe * 60 * 1000);

    const rewardNum = Number(rewardCents ?? 0);
    const rewardSafe = Number.isFinite(rewardNum) && rewardNum >= 0 ? rewardNum : 0;

    const drop = this.dropsRepo.create({
      creatorId: Number(creatorId),
      venueId: Number(venueId),
      title: title.trim(),
      description: (description ?? null) as any,
      rewardCents: String(Math.trunc(rewardSafe)),
      status: 'ACTIVE' as FreeboardDropStatus,
      claimedByUserId: null,
      claimCode: this.generateClaimCode(),
      expiresAt,
      claimedAt: null,
    });

    return this.dropsRepo.save(drop);
  }

  async claimDrop(args: ClaimDropArgs): Promise<FreeboardDrop> {
    const { userId, code } = args;

    if (!userId || Number.isNaN(Number(userId))) {
      throw new BadRequestException('userId is required.');
    }
    if (!code || !code.trim()) {
      throw new BadRequestException('Claim code is required.');
    }

    const drop = await this.dropsRepo.findOne({
      where: { claimCode: code.trim() },
    });

    if (!drop) {
      throw new NotFoundException('Drop not found for that claim code.');
    }

    if (drop.status !== 'ACTIVE') {
      throw new BadRequestException('Drop is not active.');
    }

    if (drop.expiresAt && drop.expiresAt < new Date()) {
      drop.status = 'EXPIRED';
      await this.dropsRepo.save(drop);
      throw new BadRequestException('Drop has expired.');
    }

    drop.status = 'CLAIMED';
    drop.claimedAt = new Date();
    drop.claimedByUserId = Number(userId);

    return this.dropsRepo.save(drop);
  }

  async getDropsForVenue(venueId: number): Promise<FreeboardDrop[]> {
    return this.dropsRepo.find({
      where: {
        venueId,
        status: 'ACTIVE',
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getDropsForCreator(creatorId: number): Promise<FreeboardDrop[]> {
    return this.dropsRepo.find({
      where: {
        creatorId,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async cleanupExpiredDrops(): Promise<void> {
    const now = new Date();

    const expired = await this.dropsRepo.find({
      where: {
        status: 'ACTIVE',
        expiresAt: LessThan(now),
      },
    });

    if (!expired.length) return;

    for (const drop of expired) {
      drop.status = 'EXPIRED';
    }

    await this.dropsRepo.save(expired);
  }

  private generateClaimCode(): string {
    // short code, uppercased hex, e.g. "007A6250"
    return randomBytes(4).toString('hex').toUpperCase();
  }
}
