import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';

import { UsersService } from '../users/users.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { Staff } from '../staff/staff.entity';
import { Venue } from '../venues/venue.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { ProfileService } from '../../profile/profile.service';

export type UserRole = 'buyer' | 'owner' | 'staff';

interface JwtPayload {
  sub: number;
  email: string;
  role?: UserRole;
  venueId?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly profileService: ProfileService,

    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,

    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,

    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepo: Repository<PasswordResetToken>,

    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepo: Repository<EmailVerificationToken>,
  ) {}

  private async checkUserPassword(
    plainPassword: string,
    userRecord: any,
  ): Promise<boolean> {
    if (!userRecord) return false;

    const hashed = userRecord.passwordHash ?? userRecord.passwordHashBcrypt;
    const plain = userRecord.password;

    if (hashed) {
      try {
        const ok = await bcrypt.compare(plainPassword, hashed);
        if (ok) return true;
      } catch {}
    }

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

    if (
      user &&
      ((user as any).deletedAt ||
        (user as any).anonymizedAt ||
        (user as any).isActive === false)
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await this.checkUserPassword(password, user);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.stripSensitive(user);
  }

  async validateLocal(email: string, password: string): Promise<any> {
    return this.validateUser(email, password);
  }

  private async resolveUserRoleFromProfiles(userId: number): Promise<UserRole> {
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) return 'buyer';

    const profiles = await this.profileService.listForUser(uid);
    const hasOwner = (profiles || []).some(
      (p: any) => String(p?.type || '').toLowerCase() === 'owner',
    );

    return hasOwner ? 'owner' : 'buyer';
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private isResetEligibleUser(user: any): boolean {
    return Boolean(
      user &&
        !user.deletedAt &&
        !user.anonymizedAt &&
        user.isActive !== false,
    );
  }

  private isVerificationEligibleUser(user: any): boolean {
    return Boolean(
      user &&
        !user.deletedAt &&
        !user.anonymizedAt &&
        user.isActive !== false,
    );
  }

  private async invalidateExistingResetTokens(userId: number): Promise<void> {
    await this.resetTokenRepo.update(
      {
        userId,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      {
        usedAt: new Date(),
      },
    );
  }

  private async invalidateExistingEmailVerificationTokens(
    userId: number,
  ): Promise<void> {
    await this.emailVerificationTokenRepo.update(
      {
        userId,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      {
        usedAt: new Date(),
      },
    );
  }

  async register(dto: RegisterDto): Promise<{ access_token: string }> {
    const email = String(dto.email || '').trim().toLowerCase();

    const user = await this.usersService.createUser(
      email,
      dto.password,
      dto.displayName,
      dto.referralCode,
    );

    return this.signTokenFromUser(user, 'buyer');
  }

  async requestPasswordReset(
    email: string,
    meta?: { requestedIp?: string | null; requestedUserAgent?: string | null },
  ): Promise<{ ok: true; message: string; resetToken?: string }> {
    const genericMessage =
      'If the account exists, a reset link has been sent.';

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return { ok: true, message: genericMessage };
    }

    const user = await this.usersService.findByEmail?.(normalizedEmail);
    if (!this.isResetEligibleUser(user)) {
      return { ok: true, message: genericMessage };
    }

    await this.invalidateExistingResetTokens(Number(user.id));

    const rawToken = this.generateSecureToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const tokenRow = this.resetTokenRepo.create({
      userId: Number(user.id),
      tokenHash,
      expiresAt,
      usedAt: null,
      requestedIp: meta?.requestedIp ?? null,
      requestedUserAgent: meta?.requestedUserAgent ?? null,
    });

    await this.resetTokenRepo.save(tokenRow);

    const response: { ok: true; message: string; resetToken?: string } = {
      ok: true,
      message: genericMessage,
    };

    if (String(process.env.AUTH_DEV_EXPOSE_RESET_TOKEN || '').trim() === 'true') {
      response.resetToken = rawToken;
    }

    return response;
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
  ): Promise<{ ok: true; message: string }> {
    const token = String(rawToken || '').trim();
    const password = String(newPassword || '');

    if (!token) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (password.length < 8) {
      throw new UnauthorizedException('Password must be at least 8 characters');
    }

    const tokenHash = this.hashToken(token);

    const resetRow = await this.resetTokenRepo.findOne({
      where: { tokenHash },
      order: { id: 'DESC' },
    });

    if (!resetRow) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (resetRow.usedAt) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (new Date(resetRow.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.usersService.findOneById(Number(resetRow.userId));
    if (!this.isResetEligibleUser(user)) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const updated = await this.usersService.updatePasswordHashByUserId(
      Number(resetRow.userId),
      passwordHash,
    );

    if (!updated) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    resetRow.usedAt = new Date();
    await this.resetTokenRepo.save(resetRow);

    await this.invalidateExistingResetTokens(Number(resetRow.userId));

    return {
      ok: true,
      message: 'Password has been reset successfully',
    };
  }

  async requestEmailVerification(
    email: string,
  ): Promise<{ ok: true; message: string; verificationToken?: string }> {
    const genericMessage =
      'If the account exists, a verification link has been sent.';

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return { ok: true, message: genericMessage };
    }

    const user = await this.usersService.findByEmail?.(normalizedEmail);
    if (!this.isVerificationEligibleUser(user)) {
      return { ok: true, message: genericMessage };
    }

    if ((user as any).emailVerified === true) {
      return { ok: true, message: genericMessage };
    }

    await this.invalidateExistingEmailVerificationTokens(Number(user.id));

    const rawToken = this.generateSecureToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const tokenRow = this.emailVerificationTokenRepo.create({
      userId: Number(user.id),
      tokenHash,
      expiresAt,
      usedAt: null,
    });

    await this.emailVerificationTokenRepo.save(tokenRow);

    const response: {
      ok: true;
      message: string;
      verificationToken?: string;
    } = {
      ok: true,
      message: genericMessage,
    };

    if (
      String(process.env.AUTH_DEV_EXPOSE_VERIFICATION_TOKEN || '').trim() ===
      'true'
    ) {
      response.verificationToken = rawToken;
    }

    return response;
  }

  async verifyEmail(
    rawToken: string,
  ): Promise<{ ok: true; message: string }> {
    const token = String(rawToken || '').trim();
    if (!token) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const tokenHash = this.hashToken(token);

    const verificationRow = await this.emailVerificationTokenRepo.findOne({
      where: { tokenHash },
      order: { id: 'DESC' },
    });

    if (!verificationRow) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    if (verificationRow.usedAt) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    if (new Date(verificationRow.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const user = await this.usersService.findOneById(
      Number(verificationRow.userId),
    );
    if (!this.isVerificationEligibleUser(user)) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.usersService.updateEmailVerifiedByUserId(
      Number(verificationRow.userId),
      true,
    );

    verificationRow.usedAt = new Date();
    await this.emailVerificationTokenRepo.save(verificationRow);

    await this.invalidateExistingEmailVerificationTokens(
      Number(verificationRow.userId),
    );

    return {
      ok: true,
      message: 'Email has been verified successfully',
    };
  }

  async validateStaff(email: string, password: string): Promise<any> {
    const staff = await this.staffRepo.findOne({ where: { email } });
    if (!staff) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, staff.passwordHash || '');
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (!staff.venueId || staff.venueId <= 0) {
      throw new UnauthorizedException('Staff user missing venueId');
    }

    const user = await this.usersService.findByEmail?.(email);
    if (!user?.id) {
      throw new UnauthorizedException('Staff user missing Users row');
    }

    return {
      id: user.id,
      email: staff.email,
      role: 'staff' as const,
      venueId: staff.venueId,
    };
  }

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

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.validateUser(dto.email, dto.password);

    if ((user as any).emailVerified !== true) {
      throw new ForbiddenException('EMAIL_NOT_VERIFIED');
    }

    const role = await this.resolveUserRoleFromProfiles(Number(user.id));

    if (role === 'owner') {
      const venue = await this.venueRepo.findOne({
        where: { ownerId: Number(user.id) },
        order: { createdAt: 'DESC' },
      });
      return this.signTokenFromUser(user, role, { venueId: venue?.id });
    }

    return this.signTokenFromUser(user, role);
  }

  async loginBuyer(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.validateUser(dto.email, dto.password);

    if ((user as any).emailVerified !== true) {
      throw new ForbiddenException('EMAIL_NOT_VERIFIED');
    }

    return this.signTokenFromUser(user, 'buyer');
  }

  async loginOwner(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.validateUser(dto.email, dto.password);

    if ((user as any).emailVerified !== true) {
      throw new ForbiddenException('EMAIL_NOT_VERIFIED');
    }

    const venue = await this.venueRepo.findOne({
      where: { ownerId: Number(user.id) },
      order: { createdAt: 'DESC' },
    });

    return this.signTokenFromUser(user, 'owner', { venueId: venue?.id });
  }

  async loginStaff(dto: LoginDto): Promise<{ access_token: string }> {
    const staff = await this.validateStaff(dto.email, dto.password);
    return this.signTokenFromUser(staff, 'staff', { venueId: staff.venueId });
  }
}