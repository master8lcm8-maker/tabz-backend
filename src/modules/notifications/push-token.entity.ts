import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PushTokenPlatform = 'ios' | 'android' | 'web' | 'unknown';

@Entity({ name: 'push_tokens' })
@Index(['userId'])
@Index(['token'], { unique: true })
@Index(['isActive'])
export class PushToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 32, default: 'unknown' })
  platform: PushTokenPlatform;

  @Column({ type: 'varchar', length: 512 })
  token: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  deviceId: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
