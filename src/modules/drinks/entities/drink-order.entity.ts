import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Venue } from '../../venues/venue.entity';

export enum DrinkOrderStatus {
  PENDING = 'PENDING',
  REDEEMED = 'REDEEMED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'drink_orders' })
export class DrinkOrder {
  @PrimaryGeneratedColumn()
  id: number;

  // User who bought the drink
  @Column({ type: 'int' })
  buyerId: number;

  // Venue where the drink will be redeemed
  @ManyToOne(() => Venue, { nullable: false })
  venue: Venue;

  // Foreign key column for the venue
  @Column({ type: 'int' })
  venueId: number;

  // Display name for the buyer (optional; useful for staff screens)
  @Column({ type: 'varchar', length: 100 })
  customerName: string;

  // Name of the drink item that was purchased
  @Column({ type: 'varchar', length: 100 })
  drinkName: string;

  // Price in cents charged to the user (before platform fee split)
  @Column({ type: 'int' })
  priceCents: number;

  // Optional note (e.g. “no ice”, “extra lime”)
  @Column({ type: 'text', nullable: true })
  note?: string | null;

  // Logical status of the order.
  // Stored as TEXT so it works on SQLite AND Postgres.
  @Column({
    type: 'text',
    default: DrinkOrderStatus.PENDING,
  })
  status: DrinkOrderStatus;

  // Unique redemption code used by staff to redeem the drink
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  redemptionCode: string;

  // When the order was created (TypeORM chooses proper type)
  @CreateDateColumn()
  createdAt: Date;

  // When the drink was actually redeemed by staff
  // Use 'datetime' so it's supported by SQLite.
  @Column({ type: 'datetime', nullable: true })
  redeemedAt: Date | null;
}
