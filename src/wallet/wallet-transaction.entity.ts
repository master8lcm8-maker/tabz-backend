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
  | 'cashout_reserved'
  | 'cashout_settled'
  | 'cashout_reversed'
  | 'owner_earned'
  | 'platform_fee'
  | 'referral_reward'
  | 'adjustment_credit'
  | 'adjustment_debit'
  | 'unlock_spendable';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  walletId: number | null;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column({ type: 'varchar' })
  type: WalletTransactionType;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ type: 'simple-json', nullable: true })
  metadata: any | null;

  @Column({ type: 'varchar', nullable: true })
  depositRef: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}