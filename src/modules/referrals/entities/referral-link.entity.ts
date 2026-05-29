import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ReferralLinkStatus = 'active' | 'paused' | 'disabled';

@Entity({ name: 'referral_links' })
@Index(['ownerUserId'])
@Index(['status'])
@Index(['targetType', 'targetId'])
@Index('UQ_referral_links_code', ['code'], { unique: true })
export class ReferralLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  ownerUserId: number;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text', default: 'active' })
  status: ReferralLinkStatus;

  @Column({ type: 'text', nullable: true })
  targetType: string | null;

  @Column({ type: 'integer', nullable: true })
  targetId: number | null;

  @Column({ type: 'integer', default: 0 })
  clicksCount: number;

  @Column({ type: 'integer', default: 0 })
  signupsCount: number;

  @Column({ type: 'integer', default: 0 })
  conversionsCount: number;

  @Column({ type: 'integer', default: 0 })
  rewardCents: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}