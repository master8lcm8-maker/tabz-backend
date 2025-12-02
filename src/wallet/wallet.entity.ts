// src/wallet/wallet.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WalletTransaction } from './wallet-transaction.entity';
import { CashoutRequest } from './cashout-request.entity';
import { Transfer } from './transfer.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  // TABZ user who owns this wallet
  @Column()
  userId: number;

  // Total balance (for reference / future features)
  @Column({ type: 'bigint', default: 0 })
  balanceCents: number;

  // Balance that can be spent inside TABZ
  @Column({ type: 'bigint', default: 0 })
  spendableBalanceCents: number;

  // Balance that can be withdrawn (cashout)
  @Column({ type: 'bigint', default: 0 })
  cashoutAvailableCents: number;

  // --- Relations used by other entities ---

  @OneToMany(() => WalletTransaction, (tx) => tx.wallet)
  transactions: WalletTransaction[];

  // src/wallet/cashout-request.entity.ts expects wallet.cashouts
  @OneToMany(() => CashoutRequest, (cr) => cr.wallet)
  cashouts: CashoutRequest[];

  // src/wallet/transfer.entity.ts expects wallet.outgoingTransfers
  @OneToMany(() => Transfer, (t) => t.senderWallet)
  outgoingTransfers: Transfer[];

  // src/wallet/transfer.entity.ts also expects wallet.incomingTransfers
  @OneToMany(() => Transfer, (t) => t.receiverWallet)
  incomingTransfers: Transfer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
