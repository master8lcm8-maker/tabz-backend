import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PromotionStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'completed'
  | 'canceled';

@Entity({ name: 'promotions' })
@Index(['ownerUserId'])
@Index(['status'])
@Index(['targetType', 'targetId'])
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  ownerUserId: number;

  @Column({ type: 'text' })
  targetType: string;

  @Column({ type: 'integer', nullable: true })
  targetId: number | null;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', default: 'draft' })
  status: PromotionStatus;

  @Column({ type: 'integer', default: 0 })
  listedPriceCents: number;

  @Column({ type: 'integer', default: 10 })
  platformFeePercent: number;

  @Column({ type: 'integer', default: 0 })
  platformFeeCents: number;

  @Column({ type: 'integer', default: 0 })
  merchantReceivableCents: number;

  @Column({ type: 'integer', default: 0 })
  budgetCents: number;

  @Column({ type: 'integer', default: 0 })
  spentCents: number;

  @Column({ type: 'timestamp', nullable: true })
  startsAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endsAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}