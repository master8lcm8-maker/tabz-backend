import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export type CashoutStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PAID'
  | 'FAILED'
  | 'REVERSED';

@Entity('cashout_requests')
export class CashoutRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  walletId: number;

  @ManyToOne(() => Wallet, (wallet) => wallet.cashouts, {
    onDelete: 'CASCADE',
  })
  wallet: Wallet;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ type: 'varchar', length: 20 })
  status: CashoutStatus;

  @Column({ type: 'varchar', nullable: true })
  failureReason: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  destinationLast4: string | null;

  @Column({ type: 'int', nullable: true })
  retryOfCashoutId: number | null;

  @Column({ type: 'varchar', nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  stripePayoutId: string | null;

  @Column({ type: 'varchar', nullable: true })
  stripeTransferId: string | null;

  @Column({ type: 'varchar', nullable: true })
  stripeAccountId: string | null;

  @Column({ type: 'varchar', nullable: true })
  providerStatus: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  settledAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  reversedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}