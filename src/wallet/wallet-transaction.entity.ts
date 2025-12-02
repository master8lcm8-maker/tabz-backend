// src/wallet/wallet-transaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum WalletTransactionType {
  DEPOSIT = 'deposit',
  SPEND = 'spend',
  SPEND_NO_PAYOUT = 'spend_no_payout',
  SPEND_SELF_PAYOUT = 'spend_self_payout',
  SPEND_WITH_PAYOUT = 'spend_with_payout',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  CASHOUT = 'cashout',
  CASHOUT_COMPLETE = 'cashout_complete', // ⬅️ added so wallet.service can reference it
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  wallet: Wallet;

  @Column()
  walletId: number;

  @Column({ type: 'text' })
  type: WalletTransactionType | string;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
