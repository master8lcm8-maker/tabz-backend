import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Venue } from '../../venues/venue.entity';

export enum FoodOrderStatus {
  PENDING = 'PENDING',
  REDEEMED = 'REDEEMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('food_orders')
export class FoodOrder {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * ID of the user who sent/placed the food order.
   */
  @Column({ type: 'int' })
  @Index()
  senderId: number;

  /**
   * Optional ID of the user receiving the food (if gifting).
   */
  @Column({ type: 'int', nullable: true })
  @Index()
  recipientId?: number | null;

  /**
   * Venue where this food is redeemable / prepared.
   */
  @ManyToOne(() => Venue, { nullable: false })
  @Index()
  venue: Venue;

  /**
   * Name of the food item (e.g., "Burger", "Tacos", "Wings").
   */
  @Column({ type: 'varchar', length: 120 })
  foodName: string;

  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  message?: string | null;

  /**
   * Stored as a simple string.
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: FoodOrderStatus.PENDING,
  })
  @Index()
  status: FoodOrderStatus;

  /**
   * Unique code used by staff app / QR to redeem the food order.
   */
  @Column({ type: 'varchar', length: 64, unique: true })
  @Index()
  redemptionCode: string;

  /**
   * When the food order was redeemed (Postgres-safe type).
   */
  @Column({ type: 'timestamp', nullable: true })
  redeemedAt?: Date | null;

  /**
   * When the food order expires (Postgres-safe type).
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  /**
   * Additional info stored as JSON string.
   */
  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
