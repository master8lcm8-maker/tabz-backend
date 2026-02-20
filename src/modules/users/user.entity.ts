import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';


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
}


