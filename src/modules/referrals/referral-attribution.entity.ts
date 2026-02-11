import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'referral_attributions' })
export class ReferralAttribution {
  @PrimaryGeneratedColumn()
  id: number;

  // invited user id (one-time binding)
  @Index({ unique: true })
  @Column()
  invitedUserId: number;

  // inviter user id
  @Column()
  inviterUserId: number;

  @Column()
  code: string;

  // optional metadata (keep minimal)
  @Column({ nullable: true })
  ip?: string | null;

  @Column({ nullable: true })
  userAgent?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}