import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('venue_wallets')
export class VenueWallet {
  @PrimaryGeneratedColumn()
  id: number;

  // ID of the venue (from your venues table / system)
  @Column()
  venueId: number;

  // Total earnings for this venue in cents
  @Column({ type: 'bigint', default: 0 })
  balanceCents: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
