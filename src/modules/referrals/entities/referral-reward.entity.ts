import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ReferralAttribution } from './referral-attribution.entity';
import { User } from '../../users/user.entity';

export enum ReferralRewardStatus {
  PENDING = 'pending',
  ISSUED = 'issued',
  REJECTED = 'rejected',
}

@Entity({ name: 'referral_rewards' })
@Index('UQ_referral_rewards_attribution_id', ['attributionId'], { unique: true })
@Index('IDX_referral_rewards_beneficiary_user_id', ['beneficiaryUserId'])
export class ReferralReward {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'attribution_id' })
  attributionId!: string;

  @ManyToOne(() => ReferralAttribution, (attribution) => attribution.rewards, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attribution_id' })
  attribution!: ReferralAttribution;

  @Column({ type: 'bigint', name: 'beneficiary_user_id' })
  beneficiaryUserId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'beneficiary_user_id' })
  beneficiaryUser!: User;

  @Column({ type: 'integer', name: 'amount_minor' })
  amountMinor!: number;

  @Column({ type: 'varchar', length: 16, default: 'USD', name: 'currency_code' })
  currencyCode!: string;

  @Column({
    type: 'enum',
    enum: ReferralRewardStatus,
    enumName: 'referral_reward_status_enum',
    default: ReferralRewardStatus.PENDING,
  })
  status!: ReferralRewardStatus;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'ledger_entry_id' })
  ledgerEntryId!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'issued_at' })
  issuedAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'rejection_reason' })
  rejectionReason!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}