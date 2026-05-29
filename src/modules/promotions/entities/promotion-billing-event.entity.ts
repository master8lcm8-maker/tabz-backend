import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'promotion_billing_events' })
@Index(['promotionId'])
@Index('UQ_promotion_billing_events_idempotency_key', ['idempotencyKey'], {
  unique: true,
  where: '"idempotencyKey" IS NOT NULL',
})
export class PromotionBillingEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  promotionId: number;

  @Column({ type: 'text' })
  eventType: string;

  @Column({ type: 'integer' })
  amountCents: number;

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