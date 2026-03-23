import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('user_blocks')
@Unique('uq_user_blocks_pair', ['blockerUserId', 'blockedUserId'])
export class UserBlock {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  blockerUserId: number;

  @Index()
  @Column()
  blockedUserId: number;

  @CreateDateColumn()
  createdAt: Date;
}
