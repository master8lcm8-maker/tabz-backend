import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'store_item_orders' })
export class StoreItemOrder {
  @PrimaryGeneratedColumn()
  id: number;

  // The user who bought the item (matches existing NOT NULL buyerId column)
  @Column({ type: 'int' })
  buyerId: number;

  // Total amount of this order in cents (matches NOT NULL amountCents column)
  @Column({ type: 'int' })
  amountCents: number;

  // The store item that was purchased
  @Column({ type: 'int' })
  itemId: number;

  // How many units were purchased
  @Column({ type: 'int' })
  quantity: number;

  // Order status: e.g. "pending", "completed", "cancelled"
  @Column({ type: 'varchar', length: 50 })
  status: string;

  // Optional venue that owns the item
  @Column({ type: 'int', nullable: true })
  venueId: number | null;

  // Snapshot of the item at the time of purchase
  @Column({ type: 'jsonb', nullable: true })
  itemSnapshot: any | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
