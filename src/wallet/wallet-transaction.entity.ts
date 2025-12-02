import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum WalletTransactionType {
  DEPOSIT = 'DEPOSIT',
  SPEND = 'SPEND',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_FEE = 'TRANSFER_FEE',
  CASHOUT_REQUEST = 'CASHOUT_REQUEST',
  CASHOUT_FEE = 'CASHOUT_FEE',
  CASHOUT_COMPLETE = 'CASHOUT_COMPLETE',
  LOCK_MOVEMENT = 'LOCK_MOVEMENT',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  wallet: Wallet;

  @Column({ type: 'text' })
  type: WalletTransactionType;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ nullable: true })
  referenceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
