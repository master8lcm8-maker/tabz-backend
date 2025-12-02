import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { FreeboardDrop } from './freeboard-drop.entity';
import { Venue } from '../venues/venue.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class FreeboardService {
  constructor(
    @InjectRepository(FreeboardDrop)
    private readonly dropsRepo: Repository<FreeboardDrop>,
    @InjectRepository(Venue)
    private readonly venuesRepo: Repository<Venue>,
  ) {}

  /**
   * Create a new FreeBoard drop at a venue.
   */
  async createDrop(params: {
    creatorId: number;
    venueId: number;
    title: string;
    description?: string;
    rewardCents?: number;
    expiresInMinutes?: number;
  }): Promise<FreeboardDrop> {
    const {
      creatorId,
      venueId,
      title,
      description,
      rewardCents = 0,
      expiresInMinutes,
    } = params;

    if (!title || !title.trim()) {
      throw new BadRequestException('Title is required');
    }

    const venue = await this.venuesRepo.findOne({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    let expiresAt: Date | null = null;
    if (expiresInMinutes && expiresInMinutes > 0) {
      expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    }

    const claimCode = this.generateClaimCode();

    const drop = this.dropsRepo.create({
      creatorId,
      venueId,
      venue,
      title: title.trim(),
      description: description?.trim() || null,
      rewardCents: String(rewardCents || 0),
      status: 'ACTIVE',
      claimedByUserId: null,
      claimCode,
      expiresAt,
      claimedAt: null,
    });

    return this.dropsRepo.save(drop);
  }

  /**
   * List ACTIVE drops for a given venue.
   * This is the method your controller calls: getDropsForVenue(...)
   */
  async getDropsForVenue(venueId: number): Promise<FreeboardDrop[]> {
    await this.expireOldDrops();

    return this.dropsRepo.find({
      where: {
        venueId,
        status: 'ACTIVE',
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * List drops created by a user (not wired yet, but useful later).
   */
  async getDropsForCreator(creatorId: number): Promise<FreeboardDrop[]> {
    await this.expireOldDrops();

    return this.dropsRepo.find({
      where: { creatorId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Claim a drop using its code.
   * For now: just marks it claimed. (Wallet payout can be added later.)
   */
  async claimDrop(params: { userId: number; code: string }): Promise<FreeboardDrop> {
    const { userId, code } = params;

    if (!code || !code.trim()) {
      throw new BadRequestException('Claim code is required');
    }

    await this.expireOldDrops();

    const drop = await this.dropsRepo.findOne({
      where: { claimCode: code.trim().toUpperCase() },
    });

    if (!drop) {
      throw new NotFoundException('Drop not found for this code');
    }

    if (drop.status !== 'ACTIVE') {
      throw new BadRequestException('Drop is not available to claim');
    }

    if (drop.expiresAt && drop.expiresAt.getTime() < Date.now()) {
      drop.status = 'EXPIRED';
      await this.dropsRepo.save(drop);
      throw new BadRequestException('Drop has expired');
    }

    drop.status = 'CLAIMED';
    drop.claimedByUserId = userId;
    drop.claimedAt = new Date();

    return this.dropsRepo.save(drop);
  }

  /**
   * INTERNAL: mark expired drops as EXPIRED.
   */
  private async expireOldDrops(): Promise<void> {
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
