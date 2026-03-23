// src/modules/auth/entities/email-verification-token.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'email_verification_tokens' })
export class EmailVerificationToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'bigint' })
  userId: number;

  // SHA256 hash of the raw verification token
  @Index()
  @Column({ type: 'varchar', length: 128 })
  tokenHash: string;

  @Index()
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}