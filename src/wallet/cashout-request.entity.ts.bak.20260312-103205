import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export type CashoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

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

  // NEW: last 4 digits of bank account for this cashout
  @Column({ type: 'varchar', length: 4, nullable: true })
  destinationLast4: string | null;

  // ✅ NEW: idempotency link — this cashout is a retry of another cashout
  @Column({ type: 'int', nullable: true })
  retryOfCashoutId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
