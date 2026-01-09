// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { UsersService } from '../users/users.service';
import { LoginDto } from './dtos/login.dto';
import { Staff } from '../staff/staff.entity';

// ✅ NEW: derive role from Profiles (not from "try buyer first")
import { ProfileService } from '../../profile/profile.service';

// Roles we support in TABZ
export type UserRole = 'buyer' | 'owner' | 'staff';

interface JwtPayload {
  sub: number;
  email: string;
  role?: UserRole;
  venueId?: number; // ✅ for staff
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,

    // ✅ profile role resolution
    private readonly profileService: ProfileService,

    // ✅ staff auth must come from Staff table
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
  ) {}

  // -------------------------
  // Users (buyer/owner) auth
  // -------------------------
  private async checkUserPassword(
    plainPassword: string,
    userRecord: any,
  ): Promise<boolean> {
    if (!userRecord) return false;

    const hashed = userRecord.passwordHash ?? userRecord.passwordHashBcrypt;
    const plain = userRecord.password;

    // Prefer hashed if present
    if (hashed) {
      try {
        const ok = await bcrypt.compare(plainPassword, hashed);
        if (ok) return true;
      } catch {
        // fall through
      }
    }

    // Fallback for plain-text (dev/demo) passwords
    if (plain && typeof plain === 'string') {
      return plain === plainPassword;
    }

    return false;
  }

  private stripSensitive(user: any): any {
    if (!user) return null;
    const { password, passwordHash, passwordHashBcrypt, ...safe } = user;
    return safe;
  }

  private async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail?.(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await this.checkUserPassword(password, user);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.stripSensitive(user);
  }

  // ✅ Deterministic: role derived from user's profiles
  private async resolveUserRoleFromProfiles(userId: number): Promise<UserRole> {
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) return 'buyer';

    const profiles = await this.profileService.listForUser(uid);
    const hasOwner = (profiles || []).some(
      (p: any) => String(p?.type || '').toLowerCase() === 'owner',
    );

    return hasOwner ? 'owner' : 'buyer';
  }

  // -------------------------
  // Staff auth (Staff table)
  // -------------------------
  async validateStaff(email: string, password: string): Promise<any> {
    const staff = await this.staffRepo.findOne({ where: { email } });
    if (!staff) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, staff.passwordHash || '');
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (!staff.venueId || staff.venueId <= 0) {
      throw new UnauthorizedException('Staff user missing venueId');
    }

    // ✅ CRITICAL FIX:
    // Staff tokens must use the USERS table id as JWT "sub"
    const user = await this.usersService.findByEmail?.(email);
    if (!user?.id) {
      throw new UnauthorizedException('Staff user missing Users row');
    }

    return {
      id: user.id, // ✅ MUST be Users.id (NOT staff.id)
      email: staff.email,
      role: 'staff' as const,
      venueId: staff.venueId,
    };
  }

  // -------------------------
  // JWT signing
  // -------------------------
  private signTokenFromUser(
    user: any,
    role?: UserRole,
    extras?: { venueId?: number },
  ): { access_token: string } {
    if (typeof user.id !== 'number' && typeof user.id !== 'string') {
      throw new Error('User record must have an "id" field to sign JWT');
    }
    if (!user.email) {
      throw new Error('User record must have an "email" field to sign JWT');
    }

    const payload: JwtPayload = {
      sub: Number(user.id),
      email: user.email,
      role,
      ...(extras?.venueId ? { venueId: extras.venueId } : {}),
    };

    const access_token = this.jwtService.sign(payload);
    return { access_token };
  }

  // ----------- PUBLIC API ------------

  // ✅ FIXED: login() no longer guesses buyer/owner by trying buyer first.
  // It validates credentials, then derives role from Profiles.
  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.validateUser(dto.email, dto.password);
    const role = await this.resolveUserRoleFromProfiles(Number(user.id));
    return this.signTokenFromUser(user, role);
  }

  // Keep these explicit endpoints as-is (deterministic by endpoint)
  async loginBuyer(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.signTokenFromUser(user, 'buyer');
  }

  async loginOwner(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.signTokenFromUser(user, 'owner');
  }

  // ✅ staff login uses Staff table, but JWT sub = Users.id
  async loginStaff(dto: LoginDto): Promise<{ access_token: string }> {
    const staff = await this.validateStaff(dto.email, dto.password);
    return this.signTokenFromUser(staff, 'staff', { venueId: staff.venueId });
  }
}
