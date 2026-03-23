import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('owner_bank_infos')
export class OwnerBankInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'text' })
  accountHolderNameEnc: string;

  @Column({ type: 'text' })
  routingNumberEnc: string;

  @Column({ type: 'text' })
  accountNumberEnc: string;

  @Column({ type: 'text' })
  bankNameEnc: string;

  @Column({ type: 'varchar', length: 4 })
  accountLast4: string;

  @Column({ type: 'varchar', nullable: true })
  stripeAccountId: string | null;

  @Column({ type: 'boolean', default: false })
  stripeDetailsSubmitted: boolean;

  @Column({ type: 'boolean', default: false })
  stripeChargesEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  stripePayoutsEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
