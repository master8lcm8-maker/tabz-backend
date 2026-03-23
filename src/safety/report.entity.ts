import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type ReportTargetType = 'USER' | 'DM_THREAD' | 'DM_MESSAGE' | 'WISHLIST' | 'OTHER';

@Entity('user_reports')
export class UserReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  reporterUserId: number;

  @Index()
  @Column({ type: 'text' })
  targetType: ReportTargetType;

  @Column({ type: 'text' })
  targetId: string; // string on purpose (supports UUIDs later)

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'text', nullable: true })
  metadataJson?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
