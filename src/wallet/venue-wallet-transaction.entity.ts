import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { VenueWallet } from './venue-wallet.entity';

export enum VenueWalletTransactionType {
  EARNING = 'EARNING',
  PLATFORM_FEE = 'PLATFORM_FEE',
  ADJUSTMENT = 'ADJUSTMENT',
  PAYOUT = 'PAYOUT',
}

@Entity('venue_wallet_transactions')
export class VenueWalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => VenueWallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  venueWallet: VenueWallet;

  @Column({ type: 'text' })
  type: VenueWalletTransactionType;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ nullable: true })
  referenceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
