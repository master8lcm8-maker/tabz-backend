import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ProfileType } from './profile.types';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  // Who owns this profile (maps to users table)
  @Index()
  @Column()
  userId: number;

  // SQLite-safe enum storage
  @Column({
    type: 'text',
  })
  type: ProfileType;

  // Public-facing name
  @Column({ length: 120 })
  displayName: string;

  // URL-safe identifier
  @Index({ unique: true })
  @Column({ length: 160 })
  slug: string;

  // Optional bio / description
  @Column({ type: 'text', nullable: true })
  bio?: string | null;

  // Optional avatar
  @Column({ nullable: true })
  avatarUrl?: string | null;

  // ✅ Optional cover/banner image (NEW for M27)
  @Column({ nullable: true })
  coverUrl?: string | null;

  // Soft visibility control
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
