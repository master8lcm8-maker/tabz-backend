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

  // NOTE: Controller sends "message" but DB/entity requires NOT NULL "title".
  // We map message -> title at insert time to satisfy SQLITE schema.
  async createDrop(
    creatorIdOrDto: number | { creatorId?: number; dropperId?: number; venueId: number; message?: string; title?: string; description?: string; rewardCents?: number; expiresInMinutes?: number },
    venueId?: number,
    message?: string,
    expiresInMinutes = 60,
  ): Promise<FreeboardDrop> {
    // accept either positional args OR object dto from controller (supports creatorId/dropperId)
    let creatorId: number;
    let vId: number;
    let msg: string;
    let exp: number;

    if (typeof creatorIdOrDto === 'object') {
      const dto: any = creatorIdOrDto as any;
      creatorId = Number(dto.creatorId ?? dto.dropperId);
      vId = Number(dto.venueId);
      msg = String((dto.message ?? dto.title ?? dto.description) ?? '');
      exp = (dto.expiresInMinutes === null || dto.expiresInMinutes === undefined) ? 60 : Number(dto.expiresInMinutes);
    } else {
      creatorId = Number(creatorIdOrDto);
      vId = Number(venueId);
      msg = String(message ?? '');
      exp = (expiresInMinutes === null || expiresInMinutes === undefined) ? 60 : Number(expiresInMinutes);
    }

    // rebind to the variable names the existing implementation below expects
    venueId = vId;
    message = msg;
    expiresInMinutes = exp;

    if (!message || !message.trim()) {
      throw new BadRequestException('Message is required for a drop.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

    const drop = this.dropsRepo.create({
      creatorId,
      venueId,

      // DB column is "title" (NOT NULL)
      title: message,

      status: 'ACTIVE' as FreeboardDropStatus,

      // DB column is claimedByUserId
      claimedByUserId: null,

      claimCode: this.generateClaimCode(),
      expiresAt,
      claimedAt: null,
    });

    return this.dropsRepo.save(drop);
  }

  async claimDrop(
    claimCodeOrDto: string | { code?: string; claimCode?: string; userId?: number; claimerId?: number },
    claimerIdArg?: number,
  ): Promise<FreeboardDrop> {
    // accept either positional args OR object dto from controller (supports userId/claimerId, code/claimCode)
    let claimerId: number;
    let claimCode: string;

    if (typeof claimCodeOrDto === 'object') {
      const dto: any = claimCodeOrDto as any;
      claimerId = Number(dto.userId ?? dto.claimerId);
      claimCode = String(dto.code ?? dto.claimCode ?? '');
    } else {
      claimCode = String(claimCodeOrDto ?? '');
      claimerId = Number(claimerIdArg);
    }

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
    drop.claimedByUserId = claimerId;

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
