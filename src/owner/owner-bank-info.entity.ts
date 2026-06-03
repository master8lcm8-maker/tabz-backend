// src/owner/owner-bank-info.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('owner_bank_infos')
export class OwnerBankInfo {
  @PrimaryGeneratedColumn()
  id: number;

  // ADMIN_HQ_PHASE_02Q_R2B_R8F_R6_R1_OWNER_BANK_ENTITY_FULL_MIGRATION_ALIGNMENT
  // Existing migration uses userId, not ownerId.
  @Index()
  @Column({ type: 'int' })
  userId: number;

  // Existing migration requires these encrypted fields as NOT NULL.
  // DEV/TEST only: placeholders are used until real payout/KYC encryption is wired.
  @Column({ type: 'text' })
  accountHolderNameEnc: string;

  @Column({ type: 'text' })
  routingNumberEnc: string;

  @Column({ type: 'text' })
  accountNumberEnc: string;

  @Column({ type: 'text' })
  bankNameEnc: string;

  @Column({ type: 'varchar', length: 4 })
  accountLast4: string;

  // ADMIN_HQ_MONEY_FLOW_PATCH_09A_R1_STRIPE_CONNECT_FIELDS
  // Stripe connected account readiness; TABZ does not custody payout funds.
  @Column({ type: 'varchar', nullable: true })
  stripeAccountId: string | null;

  @Column({ type: 'boolean', default: false })
  stripeDetailsSubmitted: boolean;

  @Column({ type: 'boolean', default: false })
  stripeChargesEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  stripePayoutsEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


