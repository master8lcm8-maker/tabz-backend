// src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { ReferralsService } from '../referrals/referrals.service';

export type UserRole = 'owner' | 'buyer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly referralsService: ReferralsService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // ✅ added: used by dev-seed to fetch by id
  async findOneById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /**
   * Strict create – will fail if email already exists (because of UNIQUE).
   */
  async createUser(
    email: string,
    password: string,
    displayName?: string,
    referralCode?: string,
  ): Promise<User> {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = this.usersRepository.create({
      email,
      passwordHash,
      displayName,
    });

    const savedUser = await this.usersRepository.save(newUser);
    const savedUserId = String(savedUser.id);

    if (referralCode) {
      const code = await this.referralsService.findCode(referralCode);

      if (code && code.ownerUserId !== savedUserId) {
        await this.referralsService.createAttribution(
          code.id,
          code.ownerUserId,
          savedUserId,
          code.code,
        );
      }
    }

    return savedUser;
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

      (existing as any).role = role;

      return this.usersRepository.save(existing);
    }

    const newUser = this.usersRepository.create({
      email,
      passwordHash,
      displayName,
      role,
    } as any);

    return this.usersRepository.save(newUser as any);
  }

  /**
   * Dedicated password hash update for reset-password flow.
   */
  async updatePasswordHashByUserId(
    userId: number,
    passwordHash: string,
  ): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return null;

    user.passwordHash = passwordHash;
    return this.usersRepository.save(user);
  }

  /**
   * Dedicated email verification update for verify-email flow.
   */
  async updateEmailVerifiedByUserId(
    userId: number,
    emailVerified: boolean,
  ): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return null;

    user.emailVerified = emailVerified;
    return this.usersRepository.save(user);
  }
}