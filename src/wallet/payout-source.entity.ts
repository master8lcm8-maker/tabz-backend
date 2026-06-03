import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CashoutRequest } from './cashout-request.entity';

@Entity('payout_sources')
export class PayoutSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cashoutId: number;

  @ManyToOne(() => CashoutRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cashoutId' })
  cashout: CashoutRequest;

  @Column({ type: 'varchar' })
  stripeChargeId: string;

  @Column({ type: 'varchar' })
  paymentIntentId: string;

  @Column({ type: 'bigint' })
  amountCents: number;

  @CreateDateColumn()
  createdAt: Date;
}
