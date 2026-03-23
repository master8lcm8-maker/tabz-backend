import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { ReferralCode } from './referral-code.entity';
import { ReferralReward } from './referral-reward.entity';

@Entity({ name: 'referral_attributions' })
@Index('UQ_referral_attributions_referred_user_id', ['referredUserId'], { unique: true })
@Index('IDX_referral_attributions_referrer_user_id', ['referrerUserId'])
@Index('IDX_referral_attributions_referral_code_id', ['referralCodeId'])
@Check('CHK_referral_attributions_not_self_referral', '"referred_user_id" <> "referrer_user_id"')
export class ReferralAttribution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'referral_code_id' })
  referralCodeId!: string;

  @ManyToOne(() => ReferralCode, (referralCode) => referralCode.attributions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'referral_code_id' })
  referralCode!: ReferralCode;

  @Column({ type: 'bigint', name: 'referrer_user_id' })
  referrerUserId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'referrer_user_id' })
  referrerUser!: User;

  @Column({ type: 'bigint', name: 'referred_user_id' })
  referredUserId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referred_user_id' })
  referredUser!: User;

  @Column({ type: 'varchar', length: 32, name: 'referral_code_snapshot' })
  referralCodeSnapshot!: string;

  @Column({ type: 'timestamptz', name: 'attributed_at' })
  attributedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'qualified_at' })
  qualifiedAt!: Date | null;

  @Column({ type: 'boolean', default: false, name: 'is_qualified' })
  isQualified!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => ReferralReward, (reward) => reward.attribution)
  rewards!: ReferralReward[];
}