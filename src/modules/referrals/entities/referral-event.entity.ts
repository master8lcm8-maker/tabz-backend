import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ReferralEventType = 'click' | 'signup' | 'conversion';

@Entity({ name: 'referral_events' })
@Index(['referralLinkId'])
@Index(['eventType'])
@Index(['attributedUserId'])
@Index('UQ_referral_events_idempotency_key', ['idempotencyKey'], {
  unique: true,
  where: '"idempotencyKey" IS NOT NULL',
})
export class ReferralEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  referralLinkId: number;

  @Column({ type: 'text' })
  eventType: ReferralEventType;

  @Column({ type: 'integer', nullable: true })
  actorUserId: number | null;

  @Column({ type: 'text', nullable: true })
  ipHash: string | null;

  @Column({ type: 'text', nullable: true })
  userAgentHash: string | null;

  @Column({ type: 'text', nullable: true })
  sourceUrl: string | null;

  @Column({ type: 'integer', nullable: true })
  attributedUserId: number | null;

  @Column({ type: 'text', nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}