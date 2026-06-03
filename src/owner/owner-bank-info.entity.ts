// src/owner/owner-bank-info.entity.ts
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
  ownerId: number;

  // ADMIN_HQ_PHASE_02Q_R2B_R8F_R2_R1_OWNER_BANK_ENTITY_SCHEMA_ALIGNED
  // Existing migration uses bankNameEnc and accountLast4.
  // DEV/TEST only: store plain display test value in bankNameEnc.
  @Column({ type: 'text' })
  bankNameEnc: string;

  @Column({ type: 'varchar', length: 4 })
  accountLast4: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

