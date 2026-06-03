// src/owner/owner-info.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Wallet } from '../wallet/wallet.entity';
import { Venue } from '../modules/venues/venue.entity';
import { UpdateOwnerProfileDto } from './dto/update-owner-profile.dto';
import { UpdateOwnerBankDto } from './dto/update-owner-bank.dto';
import { OwnerBankInfo } from './owner-bank-info.entity';

export type OwnerProfileResponse = {
  email: string;
  venueName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
};

export type OwnerBankResponse = {
  bankName: string;
  last4: string;
  status: 'verified' | 'pending' | 'missing';
};

export type OwnerVerificationResponse = {
  status: 'required' | 'pending' | 'verified';
};

@Injectable()
export class OwnerInfoService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,

    @InjectRepository(OwnerBankInfo)
    private readonly bankRepo: Repository<OwnerBankInfo>,
  ) {}

  // ---------------- PROFILE ----------------

  async getOwnerProfile(
    userId: number,
    email: string,
  ): Promise<OwnerProfileResponse> {
    const venue = await this.venueRepo.findOne({ where: { ownerId: userId } });

    return {
      email,
      venueName: venue?.name ?? 'Not set',
      contactEmail: email || null,
      contactPhone: null,
      address: venue?.address ?? null,
    };
  }

  async updateOwnerProfile(
    userId: number,
    email: string,
    dto: UpdateOwnerProfileDto,
  ): Promise<OwnerProfileResponse> {
    let venue = await this.venueRepo.findOne({ where: { ownerId: userId } });

    if (!venue) {
      venue = this.venueRepo.create({
        ownerId: userId,
        name: dto.venueName ?? 'New Venue',
        address: dto.address ?? null,
        city: null,
        state: null,
        country: null,
      });
    } else {
      if (dto.venueName !== undefined) {
        venue.name = dto.venueName;
      }
      if (dto.address !== undefined) {
        venue.address = dto.address;
      }
    }

    await this.venueRepo.save(venue);
    return this.getOwnerProfile(userId, email);
  }

  // ---------------- BANK INFO ----------------

  private normalizeLast4(value?: string): string {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    return digits.slice(-4);
  }

  async getOwnerBank(userId: number): Promise<OwnerBankResponse> {
    // ADMIN_HQ_PHASE_02Q_R2B_R8D_OWNER_BANK_READ_RESILIENCE
    try {
      const record = await this.bankRepo.findOne({ where: { ownerId: userId } });

      if (!record) {
        return {
          bankName: 'Not set',
          last4: '',
          status: 'missing',
        };
      }

      const status =
        'pending';

      return {
        bankName: record.bankNameEnc || 'Not set',
        last4: record.accountLast4 || '',
        status,
      };
    } catch {
      return {
        bankName: 'Not set',
        last4: '',
        status: 'missing',
      };
    }
  }

  async updateOwnerBank(
    userId: number,
    dto: UpdateOwnerBankDto,
  ): Promise<OwnerBankResponse> {
    const bankName = (dto.bankName ?? '').trim();
    const last4 = this.normalizeLast4(dto.last4);

    let record = await this.bankRepo.findOne({ where: { ownerId: userId } });

    if (!record) {
      // ADMIN_HQ_PHASE_02Q_R2B_R8F_R2_R1_OWNER_BANK_SERVICE_SCHEMA_ALIGNED
      record = this.bankRepo.create({
        ownerId: userId,
        bankNameEnc: bankName || 'Not set',
        accountLast4: last4 || '',
      });
    } else {
      if (bankName) {
        record.bankNameEnc = bankName;
      }
      if (last4) {
        record.accountLast4 = last4;
      }
      // Existing owner_bank_infos migration has no status column; return pending from service.
    }

    await this.bankRepo.save(record);

    const status =
      'pending';

    return {
      bankName: record.bankNameEnc || 'Not set',
      last4: record.accountLast4 || '',
      status,
    };
  }

  // ---------------- IDENTITY VERIFICATION (STUBBED) ----------------

  /**
   * For now, keep identity verified so UI looks correct and no 500s.
   * Later, we can wire this to a real KYC provider if you want.
   */
  async getOwnerVerification(userId: number): Promise<OwnerVerificationResponse> {
    return { status: 'verified' };
  }

  async startOwnerVerification(userId: number): Promise<OwnerVerificationResponse> {
    // In real life we'd start a flow; here we just confirm it's verified.
    return { status: 'verified' };
  }
}




