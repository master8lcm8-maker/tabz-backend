// src/payouts/payout.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from '../wallet/wallet.entity';

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  walletId: number;

  @ManyToOne(() => Wallet, (w) => w.id, { onDelete: 'CASCADE' })
  wallet: Wallet;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ type: 'varchar', length: 20 })
  status: 'PENDING' | 'COMPLETED' | 'FAILED';

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureReason: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  destinationLast4: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
