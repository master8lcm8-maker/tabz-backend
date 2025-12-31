// src/dev-seed/dev-seed.controller.ts
import {
  Controller,
  Post,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UsersService } from '../modules/users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Staff } from '../modules/staff/staff.entity';
import * as bcrypt from 'bcrypt';

import { ProfileService } from '../profile/profile.service';
import { ProfileType } from '../profile/profile.types';

@Controller('dev-seed')
export class DevSeedController {
  constructor(
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
    private readonly profileService: ProfileService,
  ) {}

  // ------------------------------------------------------------
  // Helper: create user if missing
  // ------------------------------------------------------------
  private async ensureUser(params: {
    email: string;
    password: string;
    displayName: string;
  }) {
    const existing = await this.usersService.findByEmail?.(params.email);
    if (existing) return existing;

    const createFn: any =
      (this.usersService as any).createUser ??
      (this.usersService as any).create ??
      (this.usersService as any).createDemoUser ??
      (this.usersService as any).createWithPassword;

    if (typeof createFn !== 'function') {
      throw new InternalServerErrorException(
        'UsersService is missing a create method.',
      );
    }

    try {
      return await createFn.call(
        this.usersService,
        params.email,
        params.password,
        params.displayName,
      );
    } catch {
      return await createFn.call(this.usersService, {
        email: params.email,
        password: params.password,
        displayName: params.displayName,
      });
    }
  }

  // ------------------------------------------------------------
  // Helper: ensure profile exists (idempotent)
  // ------------------------------------------------------------
  private async ensureProfile(params: {
    userId: number;
    displayName: string;
    type: ProfileType;
  }) {
    const userId = Number(params.userId);
    if (!Number.isFinite(userId) || userId <= 0) return null;

    const existing = await this.profileService.listForUser(userId);
    const found = existing?.find((p: any) => String(p?.type) === params.type);
    if (found) return found;

    const typeStr = String(params.type).toLowerCase();
    const slug = `${typeStr}-${userId}`;

    return this.profileService.createForUser(userId, {
      type: params.type,
      displayName: params.displayName,
      slug,
      bio: null,
      avatarUrl: null,
    });
  }

  // ------------------------------------------------------------
  // BUYER seed
  // ------------------------------------------------------------
  @Post('buyer')
  async seedBuyer() {
    const email = 'buyer@tabz.app';
    const password = 'password';
    const displayName = 'Demo Buyer';

    const user = await this.ensureUser({ email, password, displayName });

    if (user?.id) {
      await this.ensureProfile({
        userId: user.id,
        displayName,
        type: ProfileType.BUYER,
      });
    }

    return { ok: true, createdOrExists: true, email, userId: user?.id ?? null };
  }

  // ------------------------------------------------------------
  // OWNER seed
  // ------------------------------------------------------------
  @Post('owner')
  async seedOwner() {
    const email = 'owner@tabz.app';
    const password = 'password';
    const displayName = 'Demo Owner';

    const user = await this.ensureUser({ email, password, displayName });

    if (user?.id) {
      await this.ensureProfile({
        userId: user.id,
        displayName,
        type: ProfileType.OWNER,
      });
    }

    return { ok: true, createdOrExists: true, email, userId: user?.id ?? null };
  }

  // ------------------------------------------------------------
  // OWNER2 seed
  // ------------------------------------------------------------
  @Post('owner2')
  async seedOwner2() {
    const email = 'owner2@tabz.app';
    const password = 'password';
    const displayName = 'Demo Owner 2';

    const user = await this.ensureUser({ email, password, displayName });

    if (user?.id) {
      await this.ensureProfile({
        userId: user.id,
        displayName,
        type: ProfileType.OWNER,
      });
    }

    return { ok: true, createdOrExists: true, email, userId: user?.id ?? null };
  }

  // ------------------------------------------------------------
  // STAFF seed
  // ------------------------------------------------------------
  @Post('staff')
  async seedStaff() {
    const email = 'staff@tabz.app';
    const password = 'password123';
    const name = 'Demo Staff';
    const venueId = 4;

    // keep user creation (not used for staff auth)
    const user = await this.ensureUser({
      email,
      password,
      displayName: name,
    });

    // ✅ profile guarantee (matches your exit condition rule)
    if (user?.id) {
      await this.ensureProfile({
        userId: user.id,
        displayName: name,
        type: ProfileType.STAFF,
      });
    }

    let staff = await this.staffRepo.findOne({ where: { email } });
    const passwordHash = await bcrypt.hash(password, 10);

    if (!staff) {
      staff = this.staffRepo.create({
        email,
        name,
        venueId,
        passwordHash,
      });
    } else {
      staff.venueId = venueId;
      staff.name = name;
      staff.passwordHash = passwordHash;
    }

    staff = await this.staffRepo.save(staff);

    return {
      ok: true,
      createdOrExists: true,
      email,
      venueId,
      staffId: staff.id,
      userId: user?.id ?? null,
    };
  }

  // ------------------------------------------------------------
  // Seed everything (MUST include owner2 per your exit conditions)
  // ------------------------------------------------------------
  @Post('all')
  async seedAll() {
    const buyer = await this.seedBuyer();
    const owner = await this.seedOwner();
    const owner2 = await this.seedOwner2();
    const staff = await this.seedStaff();

    return { ok: true, buyer, owner, owner2, staff };
  }
}
