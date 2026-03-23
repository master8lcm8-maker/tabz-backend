// src/owner/owner-info.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';

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

export type OwnerStripeAccountResponse = {
  stripeAccountId: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

@Injectable()
export class OwnerInfoService {
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  });

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
    const record = await this.bankRepo.findOne({ where: { userId } });

    if (!record) {
      return {
        bankName: 'Not set',
        last4: '',
        status: 'missing',
      };
    }

    return {
      bankName: record.bankNameEnc || 'Not set',
      last4: record.accountLast4 || '',
      status: 'verified',
    };
  }

  async updateOwnerBank(
    userId: number,
    dto: UpdateOwnerBankDto,
  ): Promise<OwnerBankResponse> {
    const bankName = (dto.bankName ?? '').trim();
    const last4 = this.normalizeLast4(dto.last4);

    let record = await this.bankRepo.findOne({ where: { userId } });

    if (!record) {
      record = this.bankRepo.create({
        userId,
        accountHolderNameEnc: 'PENDING',
        routingNumberEnc: 'PENDING',
        accountNumberEnc: 'PENDING',
        bankNameEnc: bankName || 'Not set',
        accountLast4: last4 || '0000',
      });
    } else {
      if (bankName) {
        record.bankNameEnc = bankName;
      }
      if (last4) {
        record.accountLast4 = last4;
      }
    }

    await this.bankRepo.save(record);

    return {
      bankName: record.bankNameEnc || 'Not set',
      last4: record.accountLast4 || '',
      status: 'pending',
    };
  }

  // ---------------- STRIPE ACCOUNT ----------------

  async createOrGetStripeAccount(userId: number): Promise<OwnerStripeAccountResponse> {
    const record = await this.bankRepo.findOne({ where: { userId } });

    if (!record) {
      throw new BadRequestException('owner_bank_info_required');
    }

    if (record.stripeAccountId) {
      const account = await this.stripe.accounts.retrieve(record.stripeAccountId);

      record.stripeDetailsSubmitted = !!account.details_submitted;
      record.stripeChargesEnabled = !!account.charges_enabled;
      record.stripePayoutsEnabled = !!account.payouts_enabled;
      await this.bankRepo.save(record);

      return {
        stripeAccountId: record.stripeAccountId,
        detailsSubmitted: record.stripeDetailsSubmitted,
        chargesEnabled: record.stripeChargesEnabled,
        payoutsEnabled: record.stripePayoutsEnabled,
      };
    }

    const account = await this.stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: undefined,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        userId: String(userId),
      },
    });

    record.stripeAccountId = account.id;
    record.stripeDetailsSubmitted = !!account.details_submitted;
    record.stripeChargesEnabled = !!account.charges_enabled;
    record.stripePayoutsEnabled = !!account.payouts_enabled;
    await this.bankRepo.save(record);

    return {
      stripeAccountId: record.stripeAccountId,
      detailsSubmitted: record.stripeDetailsSubmitted,
      chargesEnabled: record.stripeChargesEnabled,
      payoutsEnabled: record.stripePayoutsEnabled,
    };
  }


  

  

  async createStripeOnboardingLink(userId: number): Promise<{ url: string }> {
    const record = await this.bankRepo.findOne({ where: { userId } });

    if (!record || !record.stripeAccountId) {
      throw new BadRequestException('stripe_account_required');
    }

    const refreshUrl =
      process.env.STRIPE_CONNECT_REFRESH_URL ||
      'http://localhost:8081/owner/bank?refresh=1';

    const returnUrl =
      process.env.STRIPE_CONNECT_RETURN_URL ||
      'http://localhost:8081/owner/bank?return=1';

    const link = await this.stripe.accountLinks.create({
      account: record.stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return { url: link.url };
  }

  async refreshStripeAccountStatus(
    userId: number,
  ): Promise<OwnerStripeAccountResponse> {
    const record = await this.bankRepo.findOne({ where: { userId } });

    if (!record || !record.stripeAccountId) {
      throw new BadRequestException('stripe_account_required');
    }

    const account = await this.stripe.accounts.retrieve(record.stripeAccountId);

    record.stripeDetailsSubmitted = !!account.details_submitted;
    record.stripeChargesEnabled = !!account.charges_enabled;
    record.stripePayoutsEnabled = !!account.payouts_enabled;
    await this.bankRepo.save(record);

    return {
      stripeAccountId: record.stripeAccountId,
      detailsSubmitted: record.stripeDetailsSubmitted,
      chargesEnabled: record.stripeChargesEnabled,
      payoutsEnabled: record.stripePayoutsEnabled,
    };
  }
  // ---------------- IDENTITY VERIFICATION (STUBBED) ----------------

  async getOwnerVerification(userId: number): Promise<OwnerVerificationResponse> {
    return { status: 'verified' };
  }

  async startOwnerVerification(userId: number): Promise<OwnerVerificationResponse> {
    return { status: 'verified' };
  }
}




