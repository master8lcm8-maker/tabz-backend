import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type AccountDeletionStatus = "pending" | "confirmed" | "completed" | "rejected";

@Entity({ name: "account_deletion_requests" })
export class AccountDeletionRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "bigint" })
  userId!: number;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: AccountDeletionStatus;

  // user-provided reason
  @Column({ type: "text", nullable: true })
  reason?: string | null;

  // audit fields (policy decision later: retain vs scrub)
  @Column({ type: "text", nullable: true })
  ip?: string | null;

  @Column({ type: "text", nullable: true })
  userAgent?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  confirmedAt?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  completedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}