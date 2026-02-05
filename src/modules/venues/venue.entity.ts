import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Staff } from '../staff/staff.entity';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn()
  id: number;

  // 🔑 very important: this must exist so TypeORM sends ownerId to the DB
  @Column({ type: 'int' })
  ownerId: number;

  @Column({ type: 'int', nullable: true })
  ownerProfileId: number | null;

  // ✅ FV-17.1.A — venue slug
  @Column({ type: 'varchar', length: 120, nullable: true })
  slug: string | null;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  // ✅ FV-25 — Optional venue avatar
  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null;

  // ✅ FV-25 — Optional venue cover/banner
  @Column({ type: 'varchar', length: 255, nullable: true })
  coverUrl: string | null;

  // ✅ REQUIRED inverse side for Staff → Venue
  @OneToMany(() => Staff, (staff) => staff.venue)
  staff: Staff[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
