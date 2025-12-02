import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum CashoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('cashout_requests')
export class CashoutRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Wallet, (wallet) => wallet.cashouts, {
    onDelete: 'CASCADE',
  })
  wallet: Wallet;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ type: 'text', default: CashoutStatus.PENDING })
  status: CashoutStatus;

  @Column({ nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;
}
