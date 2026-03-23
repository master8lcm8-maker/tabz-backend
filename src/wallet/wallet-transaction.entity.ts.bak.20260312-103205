// src/wallet/wallet-transaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export type WalletTransactionType =
  | 'deposit'
  | 'spend'
  | 'spend_no_payout'
  | 'spend_self_payout'
  | 'spend_with_payout'
  | 'payout_credit'
  | 'transfer_in'
  | 'transfer_out'
  | 'cashout'
  | 'unlock_spendable';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Foreign key to the wallet that owns this transaction.
   * Existing rows may have this null (from before we added it),
   * but all new rows created by WalletService will set it.
   */
  @Column({ nullable: true })
  walletId: number | null;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column({ type: 'varchar' })
  type: WalletTransactionType;

  @Column({ type: 'bigint' })
  amountCents: number;

  /**
   * Extra info about the transaction:
   * - fee, venueShare, receiverId, itemId, venueId, etc
   */
  @Column({ type: 'simple-json', nullable: true })
  metadata: any | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
