import {
Entity,
PrimaryGeneratedColumn,
Column,
CreateDateColumn,
UpdateDateColumn,
Index,
} from 'typeorm';

@Entity({ name: 'password_reset_tokens' })
export class PasswordResetToken {
@PrimaryGeneratedColumn()
id: number;

@Index()
@Column({ type: 'bigint' })
userId: number;

// SHA256 hash of the raw reset token
@Index()
@Column({ type: 'varchar', length: 128 })
tokenHash: string;

@Index()
@Column({ type: 'timestamptz' })
expiresAt: Date;

@Column({ type: 'timestamptz', nullable: true })
usedAt?: Date | null;

@Column({ type: 'text', nullable: true })
requestedIp?: string | null;

@Column({ type: 'text', nullable: true })
requestedUserAgent?: string | null;

@CreateDateColumn({ type: 'timestamptz' })
createdAt: Date;

@UpdateDateColumn({ type: 'timestamptz' })
updatedAt: Date;
}
