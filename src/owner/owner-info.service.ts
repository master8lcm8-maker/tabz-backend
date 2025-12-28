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
    const record = await this.bankRepo.findOne({ where: { ownerId: userId } });

    if (!record) {
      // No bank on file
      return {
        bankName: 'Not set',
        last4: '',
        status: 'missing',
      };
    }

    const status =
      (record.status as 'verified' | 'pending' | 'missing') || 'pending';

    return {
      bankName: record.bankName || 'Not set',
      last4: record.last4 || '',
      status,
    };
  }

  async updateOwnerBank(
    userId: number,
    dto: UpdateOwnerBankDto,
  ): Promise<OwnerBankResponse> {
    const bankName = (dto.bankName ?? '').trim();
    const last4 = this.normalizeLast4(dto.last4);

    let record = await this.bankRepo.findOne({ where: { ownerId: userId } });

    if (!record) {
      record = this.bankRepo.create({
        ownerId: userId,
        bankName: bankName || null,
        last4: last4 || null,
        status: 'pending',
        verificationStatus: 'required',
      });
    } else {
      if (bankName) {
        record.bankName = bankName;
      }
      if (last4) {
        record.last4 = last4;
      }
      // whenever bank info changes, force bank status back to pending
      record.status = 'pending';
    }

    await this.bankRepo.save(record);

    const status =
      (record.status as 'verified' | 'pending' | 'missing') || 'pending';

    return {
      bankName: record.bankName || 'Not set',
      last4: record.last4 || '',
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
