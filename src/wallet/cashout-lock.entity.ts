import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('cashout_locks')
export class CashoutLock {
  @PrimaryGeneratedColumn()
  id: number;

  // User who owns this locked amount
  @Index()
  @Column()
  userId: number;

  // Amount locked in cents
  @Column({ type: 'bigint' })
  amountCents: number;

  // When this amount becomes eligible for cashout
  @Column()
  unlockAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
