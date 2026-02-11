import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('engagement_event')
export class EngagementEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  eventType: string;

  @CreateDateColumn()
  createdAt: Date;
}
