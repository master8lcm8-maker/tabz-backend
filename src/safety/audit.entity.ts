import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type AuditTargetType = 'USER' | 'DM_THREAD' | 'DM_MESSAGE' | 'WALLET' | 'CASHOUT' | 'OTHER';

@Entity('audit_events')
export class AuditEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  actorUserId: number;

  @Column({ type: 'text' })
  action: string;

  @Index()
  @Column({ type: 'text' })
  targetType: AuditTargetType;

  @Column({ type: 'text' })
  targetId: string;

  @Column({ type: 'text', nullable: true })
  metadataJson?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
