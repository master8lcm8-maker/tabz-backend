// src/wallet/venue-wallet.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VenueWalletTransaction } from './venue-wallet-transaction.entity';

@Entity('venue_wallets')
export class VenueWallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  venueId: number;

  @Column({ type: 'bigint', default: 0 })
  balanceCents: number;

  @Column({ type: 'bigint', default: 0 })
  cashoutAvailableCents: number;

  @OneToMany(
    () => VenueWalletTransaction,
    (tx) => tx.venueWallet,
  )
  transactions: VenueWalletTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
