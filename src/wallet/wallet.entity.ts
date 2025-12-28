import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { CashoutRequest } from './cashout-request.entity';
import { Transfer } from './transfer.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  userId: number;

  // Total balance (reporting)
  @Column({ type: 'bigint', default: 0 })
  balanceCents: number;

  // Spendable inside TABZ
  @Column({ type: 'bigint', default: 0 })
  spendableBalanceCents: number;

  // Available for cashout
  @Column({ type: 'bigint', default: 0 })
  cashoutAvailableCents: number;

  // 🔑 REQUIRED RELATIONS (were missing)
  @OneToMany(() => CashoutRequest, (c) => c.wallet)
  cashouts: CashoutRequest[];

  @OneToMany(() => Transfer, (t) => t.senderWallet)
  outgoingTransfers: Transfer[];

  @OneToMany(() => Transfer, (t) => t.receiverWallet)
  incomingTransfers: Transfer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
