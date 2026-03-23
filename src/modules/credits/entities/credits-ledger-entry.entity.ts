import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type CreditsLedgerType =
  | 'EARN'
  | 'SPEND'
  | 'HOLD'
  | 'RELEASE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'REFUND'
  | 'ADJUST';

@Entity({ name: 'credits_ledger_entry' })
@Index(['accountId'])
@Index(['userId'])
@Index(['refType', 'refId'])
export class CreditsLedgerEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  accountId: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'text' })
  type: CreditsLedgerType;

  // Signed integer. Positive = credit in, Negative = credit out
  @Column({ type: 'integer' })
  amountCents: number;

  // Optional: user on the other side of a transfer/request
  @Column({ type: 'integer', nullable: true })
  relatedUserId: number | null;

  // Generic pointer to an object that caused the change (wishlist, order, etc.)
  @Column({ type: 'text', nullable: true })
  refType: string | null;

  @Column({ type: 'integer', nullable: true })
  refId: number | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: any | null;

  @CreateDateColumn()
  createdAt: Date;
}
