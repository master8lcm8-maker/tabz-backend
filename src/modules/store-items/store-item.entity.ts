import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'store_items' })
export class StoreItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // Map TypeScript property "priceCents" to DB column "amountCents"
  @Column({ name: 'amountCents', type: 'int' })
  priceCents: number;

  @Column({ type: 'int', nullable: true })
  venueId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
