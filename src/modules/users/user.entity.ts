import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

const DT_TYPE = (process.env.DATABASE_URL || process.env.DB_HOST) ? 'timestamptz' : 'datetime';


export type UserRole = 'owner' | 'buyer';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  // Store hashed password, NEVER plain text
  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  displayName?: string;

  
  @Column({ type: 'varchar', default: 'buyer' })
  role: UserRole;
@Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: DT_TYPE as any, nullable: true })
  deletedAt: Date | null;

  @Column({ type: DT_TYPE as any, nullable: true })
  anonymizedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  deletionReason: string | null;
}


