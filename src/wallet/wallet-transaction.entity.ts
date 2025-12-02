// src/wallet/wallet-transaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  // Real FK field so walletId exists on this entity
  @Column()
  walletId: number;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  // Must allow exact string values wallet.service.ts uses
  @Column({ type: 'text' })
  type: string;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ nullable: true })
  referenceId: string | null;

  // Required because wallet.service.ts save() sends metadata objects
  @Column({ type: 'jsonb', nullable: true })
  metadata: any | null;

  @CreateDateColumn()
  createdAt: Date;
}
