// src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

export type UserRole = 'owner' | 'buyer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  /**
   * Strict create – will fail if email already exists (because of UNIQUE).
   */
  async createUser(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<User> {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = this.usersRepository.create({
      email,
      passwordHash,
      displayName,
    });

    return this.usersRepository.save(newUser);
  }

  /**
   * Upsert-style helper:
   * - If user exists -> update passwordHash + optional displayName + optional role
   * - Else -> create new user
   *
   * IMPORTANT:
   * This assumes your User entity has a `role` column.
   */
  async upsertUser(
    email: string,
    password: string,
    displayName?: string,
    role: UserRole = 'buyer',
  ): Promise<User> {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const existing = await this.usersRepository.findOne({ where: { email } });

    if (existing) {
      existing.passwordHash = passwordHash;

      if (displayName !== undefined) {
        existing.displayName = displayName;
      }

      // only touch role if provided (still defaulted to buyer if caller didn't pass)
      // NOTE: this line requires User.role to exist
      (existing as any).role = role;

      return this.usersRepository.save(existing);
    }

    const newUser = this.usersRepository.create({
      email,
      passwordHash,
      displayName,
      // NOTE: this line requires User.role to exist
      role,
    } as any);

    return this.usersRepository.save(newUser);
  }
}
