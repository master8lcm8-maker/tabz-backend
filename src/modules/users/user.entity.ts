import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  // Store hashed password, NEVER plain text
  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  displayName?: string;

  @Column({ default: true })
  isActive: boolean;

  // Email verification status (P5 security)
  @Column({ default: false })
  emailVerified: boolean;

  // --- P5 / Prod schema alignment ---
  // NOTE: prod uses bigint ids; we keep TS number for practicality.
  @Column({ type: 'varchar', length: 20, default: 'buyer' })
  role: string;

  @Column({ type: 'bigint', nullable: true })
  venueId?: number | null;

  @Column({ type: 'bigint', nullable: true })
  profileId?: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  anonymizedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  deletionReason?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}