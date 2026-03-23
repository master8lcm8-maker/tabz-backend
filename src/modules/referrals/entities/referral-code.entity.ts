import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ReferralAttribution } from './referral-attribution.entity';

@Entity({ name: 'referral_codes' })
@Index('UQ_referral_codes_code', ['code'], { unique: true })
@Index('UQ_referral_codes_owner_user_id', ['ownerUserId'], { unique: true })
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'bigint', name: 'owner_user_id' })
  ownerUserId!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'disabled_at' })
  disabledAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => ReferralAttribution, (attribution) => attribution.referralCode)
  attributions!: ReferralAttribution[];
}