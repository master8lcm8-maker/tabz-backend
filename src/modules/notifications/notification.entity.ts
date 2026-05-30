import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type NotificationAudience = 'user' | 'owner' | 'staff' | 'admin';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export type NotificationType =
  | 'gift'
  | 'freeboard'
  | 'order'
  | 'wallet'
  | 'payout'
  | 'refund'
  | 'dispute'
  | 'safety'
  | 'system';

@Entity({ name: 'notifications' })
@Index(['userId'])
@Index(['audience'])
@Index(['status'])
@Index(['type'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 32, default: 'user' })
  audience: NotificationAudience;

  @Column({ type: 'varchar', length: 32 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 32, default: 'unread' })
  status: NotificationStatus;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  sourceType: string | null;

  @Column({ type: 'int', nullable: true })
  sourceId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}