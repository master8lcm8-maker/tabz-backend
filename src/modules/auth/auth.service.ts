// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { UsersService } from '../users/users.service';
import { LoginDto } from './dtos/login.dto';
import { Staff } from '../staff/staff.entity';

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

  async validateBuyer(email: string, password: string): Promise<any> {
    return this.validateUser(email, password);
  }

  async validateOwner(email: string, password: string): Promise<any> {
    return this.validateUser(email, password);
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
    // so /auth/me + profile lookups resolve correctly.
    const user = await this.usersService.findByEmail?.(email);
    if (!user?.id) {
      throw new UnauthorizedException('Staff user missing Users row');
    }

    // return "user-like" object for signing
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

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.validateLocal(dto.email, dto.password);
    const role: UserRole =
      (user as any)._authType === 'owner' ? 'owner' : 'buyer';
    const { _authType, ...rest } = user as any;
    return this.signTokenFromUser(rest, role);
  }

  async validateLocal(email: string, password: string): Promise<any> {
    // Try buyer first
    try {
      const buyer = await this.validateBuyer(email, password);
      return { ...buyer, _authType: 'buyer' };
    } catch {}

    // Then owner
    try {
      const owner = await this.validateOwner(email, password);
      return { ...owner, _authType: 'owner' };
    } catch {}

    throw new UnauthorizedException('Invalid credentials');
  }

  async loginBuyer(dto: LoginDto): Promise<{ access_token: string }> {
    const buyer = await this.validateBuyer(dto.email, dto.password);
    return this.signTokenFromUser(buyer, 'buyer');
  }

  async loginOwner(dto: LoginDto): Promise<{ access_token: string }> {
    const owner = await this.validateOwner(dto.email, dto.password);
    return this.signTokenFromUser(owner, 'owner');
  }

  // ✅ staff login uses Staff table, but JWT sub = Users.id
  async loginStaff(dto: LoginDto): Promise<{ access_token: string }> {
    const staff = await this.validateStaff(dto.email, dto.password);
    return this.signTokenFromUser(staff, 'staff', { venueId: staff.venueId });
  }
}
