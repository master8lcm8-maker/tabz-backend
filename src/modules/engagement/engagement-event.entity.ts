import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('engagement_event')
export class EngagementEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  eventType: string;

  // Optional: what this event is "about" (e.g., freeboardItemId, referralCode, venueId, etc.)
  @Column({ nullable: true })
  targetId?: string;

  // Optional structured details (stored as text in sqlite via TypeORM simple-json)
  @Column({ type: 'simple-json', nullable: true })
  metadata?: any;

  @CreateDateColumn()
  createdAt: Date;
}
