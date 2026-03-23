import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type CreditsTransferStatus =
  | 'REQUESTED'
  | 'FUNDED'
  | 'CANCELED'
  | 'EXPIRED'
  | 'COMPLETED'
  | 'FAILED';

@Entity({ name: 'credits_transfer' })
@Index(['toUserId'])
@Index(['fromUserId'])
@Index(['status'])
export class CreditsTransfer {
  @PrimaryGeneratedColumn()
  id: number;

  // Nullable: a "request" can be created with no fixed payer yet
  @Column({ type: 'integer', nullable: true })
  fromUserId: number | null;

  // Required: who receives the credits (or who is requesting them)
  @Column({ type: 'integer' })
  toUserId: number;

  @Column({ type: 'integer' })
  amountCents: number;

  // ✅ REQUIRED: tracks partial funding progress (exists in DB)
  @Column({ type: 'integer', default: 0 })
  fundedCents: number;

  @Column({ type: 'text', default: 'REQUESTED' })
  status: CreditsTransferStatus;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: any | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
