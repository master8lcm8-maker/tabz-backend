import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('stripe_webhook_events')
export class StripeWebhookEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  eventId: string;

  @Column()
  type: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;
}