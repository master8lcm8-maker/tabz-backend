// src/wallet/venue-wallet-transaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { VenueWallet } from './venue-wallet.entity';

export type VenueWalletTransactionType =
  | 'deposit'
  | 'spend'
  | 'payout_credit'
  | 'transfer_in'
  | 'transfer_out'
  | 'cashout';

@Entity('venue_wallet_transactions')
export class VenueWalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  venueWalletId: number;

  // ✅ MUST declare inverse side because VenueWallet has OneToMany(transactions)
  @ManyToOne(() => VenueWallet, (vw) => vw.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueWalletId' })
  venueWallet: VenueWallet;

  @Column({ type: 'varchar' })
  type: VenueWalletTransactionType;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ type: 'simple-json', nullable: true })
  metadata: any | null;

  @CreateDateColumn()
  createdAt: Date;
}
