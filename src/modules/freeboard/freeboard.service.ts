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

@Injectable()
export class FreeboardService {
  constructor(
    @InjectRepository(FreeboardDrop)
    private readonly dropsRepo: Repository<FreeboardDrop>,
  ) {}

  async createDrop(
    creatorId: number,
    venueId: number,
    message: string,
    expiresInMinutes = 60,
  ): Promise<FreeboardDrop> {
    if (!message || !message.trim()) {
      throw new BadRequestException('Message is required for a drop.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

    const drop = this.dropsRepo.create({
      creatorId,
      venueId,
      message,
      status: 'ACTIVE' as FreeboardDropStatus,
      claimCode: this.generateClaimCode(),
      expiresAt,
      claimedAt: null,
    });

    return this.dropsRepo.save(drop);
  }

  async claimDrop(
    claimCode: string,
    claimerId: number,
  ): Promise<FreeboardDrop> {
    if (!claimCode) {
      throw new BadRequestException('Claim code is required.');
    }

    const drop = await this.dropsRepo.findOne({
      where: { claimCode },
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
    drop.claimerId = claimerId;

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
