import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'referral_codes' })
export class ReferralCode {
  @PrimaryGeneratedColumn()
  id: number;

  // inviter user id
  @Index({ unique: true })
  @Column()
  userId: number;

  @Index({ unique: true })
  @Column()
  code: string;

  @CreateDateColumn()
  createdAt: Date;
}