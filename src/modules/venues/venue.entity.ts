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

  @Column({ type: 'int' })
  ownerId: number;

  @Column({ type: 'int', nullable: true })
  ownerProfileId: number | null;

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

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  coverUrl: string | null;

  @Column({ type: 'boolean', default: true })
  acceptingDrinks: boolean;

  @Column({ type: 'boolean', default: true })
  acceptingRequests: boolean;

  @Column({ type: 'boolean', default: true })
  acceptingFreeboard: boolean;

  @Column({ type: 'boolean', default: true })
  acceptingRedemptions: boolean;

  @Column({ type: 'boolean', default: false })
  isPrivate: boolean;

  @Column({ type: 'boolean', default: false })
  isPaused: boolean;

  @OneToMany(() => Staff, (s) => s.venue)
  staffMembers: Staff[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
