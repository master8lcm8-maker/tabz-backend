import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Venue } from '../venues/venue.entity';

const DT_TYPE = (process.env.DATABASE_URL || process.env.DB_HOST) ? 'timestamptz' : 'datetime';

export type FreeboardDropStatus = 'ACTIVE' | 'CLAIMED' | 'EXPIRED';

@Entity('freeboard_drops')
export class FreeboardDrop {
  @PrimaryGeneratedColumn()
  id: number;

  // User who created / dropped this
  @Column()
  creatorId: number;

  // Where it was dropped
  @Column()
  venueId: number;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  // Optional reward amount (cents) – wallet logic will come later
  @Column('bigint', { default: 0 })
  rewardCents: string;

  // Status: ACTIVE (available), CLAIMED, EXPIRED
  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: FreeboardDropStatus;

  // User who claimed it (null if not claimed yet)
  @Column({ nullable: true })
  claimedByUserId: number | null;

  // For future QR / code redemption
  @Column({ nullable: true })
  claimCode: string | null;

  // ⚠ FIXED FOR SQLITE — was timestamptz
  @Column({ type: DT_TYPE as any, nullable: true })
  expiresAt: Date | null;

  // ⚠ FIXED FOR SQLITE — was timestamptz
  @Column({ type: DT_TYPE as any, nullable: true })
  claimedAt: Date | null;

  @CreateDateColumn({ type: DT_TYPE as any })
  createdAt: Date;

  @UpdateDateColumn({ type: DT_TYPE as any })
  updatedAt: Date;
}
