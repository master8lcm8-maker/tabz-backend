import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'credits_account' })
@Index(['userId'], { unique: true })
export class CreditsAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  // Spendable credits available now
  @Column({ type: 'integer', default: 0 })
  balanceCents: number;

  // Held/reserved credits (escrow for pending transfers)
  @Column({ type: 'integer', default: 0 })
  heldCents: number;

  // Optional analytics counters (not required for correctness)
  @Column({ type: 'integer', default: 0 })
  lifetimeEarnedCents: number;

  @Column({ type: 'integer', default: 0 })
  lifetimeSpentCents: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
