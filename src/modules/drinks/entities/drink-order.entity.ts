import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Venue } from '../../venues/venue.entity'; // <-- FIXED PATH

export enum DrinkOrderStatus {
  PENDING = 'PENDING',
  REDEEMED = 'REDEEMED',
  CANCELLED = 'CANCELLED',
}

@Entity('drink_orders')
export class DrinkOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  senderId: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  recipientId: number | null;

  @ManyToOne(() => Venue, (venue) => venue.drinkOrders, { nullable: false })
  venue: Venue;

  @Column()
  drinkName: string;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({
    type: 'enum',
    enum: DrinkOrderStatus,
    default: DrinkOrderStatus.PENDING,
  })
  status: DrinkOrderStatus;

  @Index({ unique: true })
  @Column()
  redemptionCode: string;

  @CreateDateColumn()
  createdAt: Date;

  // Postgres-safe timestamp type (no "datetime")
  @Column({ type: 'timestamp', nullable: true })
  redeemedAt: Date | null;
}
