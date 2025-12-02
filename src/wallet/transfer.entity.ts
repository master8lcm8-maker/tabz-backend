import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Wallet, (wallet) => wallet.outgoingTransfers, {
    onDelete: 'CASCADE',
  })
  senderWallet: Wallet;

  @ManyToOne(() => Wallet, (wallet) => wallet.incomingTransfers, {
    onDelete: 'CASCADE',
  })
  receiverWallet: Wallet;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ type: 'bigint', default: 0 })
  feeCents: number;

  @Column({ default: false })
  unlockedForCashout: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
