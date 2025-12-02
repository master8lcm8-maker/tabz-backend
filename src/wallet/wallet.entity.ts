import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  // Owner user ID (required by WalletService.getOrCreateWallet)
  @Index()
  @Column()
  userId: number;

  // Balance that can be spent inside TABZ (in cents)
  @Column({ type: 'bigint', default: 0 })
  spendableBalanceCents: number;

  // Balance that can be cashed out (in cents)
  @Column({ type: 'bigint', default: 0 })
  cashoutAvailableCents: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
