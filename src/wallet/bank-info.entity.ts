import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bank_info')
export class BankInfo {
  @PrimaryGeneratedColumn()
  id: number;

  // Owner user ID (owner3, etc.)
  @Column()
  userId: number;

  // These are "Enc" fields but for now we can store plain text in dev.
  @Column({ type: 'varchar', length: 255 })
  bankNameEnc: string;

  @Column({ type: 'varchar', length: 255 })
  accountHolderNameEnc: string;

  @Column({ type: 'varchar', length: 255 })
  routingNumberEnc: string;

  @Column({ type: 'varchar', length: 255 })
  accountNumberEnc: string;

  // Convenience: last 4 digits used for display & cashout destination
  @Column({ type: 'varchar', length: 4 })
  accountLast4: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
