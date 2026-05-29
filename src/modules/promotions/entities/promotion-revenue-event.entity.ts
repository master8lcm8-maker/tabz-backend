import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'promotion_revenue_events' })
@Index(['promotionId'])
@Index('UQ_promotion_revenue_events_idempotency_key', ['idempotencyKey'], {
  unique: true,
  where: '"idempotencyKey" IS NOT NULL',
})
export class PromotionRevenueEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  promotionId: number;

  @Column({ type: 'text' })
  sourceType: string;

  @Column({ type: 'integer', nullable: true })
  sourceId: number | null;

  @Column({ type: 'integer' })
  grossCents: number;

  @Column({ type: 'integer', default: 0 })
  platformFeeCents: number;

  @Column({ type: 'integer', default: 0 })
  merchantReceivableCents: number;

  @Column({ type: 'text', nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}