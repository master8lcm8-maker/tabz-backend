import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";

import { AccountDeletionRequest } from "./account-deletion-request.entity";
import { UsersService } from "../users/users.service";
import { User } from "../users/user.entity";
import { Profile } from "../../profile/profile.entity";

function safeStr(v: any, max: number) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

@Injectable()
export class AccountDeletionService {
  constructor(
    @InjectRepository(AccountDeletionRequest)
    private readonly reqRepo: Repository<AccountDeletionRequest>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,

    private readonly usersService: UsersService,
  ) {}

  async requestDeletion(input: {
    userId: number;
    reason?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const userId = Number(input.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestException("invalid_user");
    }

    // If user already deleted/anonymized/inactive, block (keeps state clean)
    const user = await this.usersService.findOneById(userId);
    if (!user) throw new ForbiddenException("forbidden");
    if ((user as any).deletedAt || (user as any).anonymizedAt || (user as any).isActive === false) {
      throw new BadRequestException("already_deleted");
    }

    // One active pending request per user
    const existing = await this.reqRepo.findOne({
      where: { userId: userId as any, status: "pending" as any } as any,
      order: { id: "DESC" as any },
    });

    if (existing) {
      return { ok: true, request: existing, alreadyPending: true };
    }

    const reqRow = this.reqRepo.create({
      userId,
      status: "pending",
      reason: safeStr(input.reason, 500),
      ip: safeStr(input.ip, 120),
      userAgent: safeStr(input.userAgent, 400),
    });

    const saved = await this.reqRepo.save(reqRow);
    return { ok: true, request: saved };
  }

  async confirmDeletion(input: { userId: number; password: string; reason?: string | null }) {
    const userId = Number(input.userId);
    if (!Number.isFinite(userId) || userId <= 0) throw new BadRequestException("invalid_user");

    const password = String(input.password ?? "");
    if (!password) throw new BadRequestException("password_required");

    // Use a transaction: request row + user scrub + profile scrub must commit together
    return await this.reqRepo.manager.transaction(async (m) => {
      const reqRepo = m.getRepository(AccountDeletionRequest);
      const userRepo = m.getRepository(User);
      const profileRepo = m.getRepository(Profile);

      const user = await userRepo.findOne({ where: { id: userId as any } as any });
      if (!user) throw new ForbiddenException("forbidden");

      // If already deleted/anonymized/inactive, stop
      if ((user as any).deletedAt || (user as any).anonymizedAt || (user as any).isActive === false) {
        throw new BadRequestException("already_deleted");
      }

      // Verify password for real (prevents "any password deletes" bug)
      const hash = (user as any).passwordHash;
      if (!hash) throw new UnauthorizedException("invalid_credentials");
      const ok = await bcrypt.compare(password, String(hash));
      if (!ok) throw new UnauthorizedException("invalid_credentials");

      // Find pending request or create one (idempotent)
      let reqRow = await reqRepo.findOne({
        where: { userId: userId as any, status: "pending" as any } as any,
        order: { id: "DESC" as any },
      });

      if (!reqRow) {
        reqRow = reqRepo.create({
          userId,
          status: "pending",
          reason: safeStr(input.reason, 500),
        });
        reqRow = await reqRepo.save(reqRow);
      }

      // Mark confirmed
      reqRow.status = "confirmed";
      reqRow.confirmedAt = new Date();
      if (input.reason) reqRow.reason = safeStr(input.reason, 500);
      await reqRepo.save(reqRow);

      const now = new Date();
      const stamp = now.getTime();

      // USERS scrub
      const tag = `deleted+${userId}+${stamp}`;
      const newEmail = `${tag}@tabz.app`;

      await userRepo.update(
        { id: userId as any } as any,
        {
          email: newEmail as any,
          displayName: null as any,
          passwordHash: null as any,
          isActive: false as any,
          deletedAt: now as any,
          anonymizedAt: now as any,
          deletionReason: safeStr(input.reason, 500) as any,
        } as any,
      );

      // PROFILES scrub (live schema proof showed profiles.displayName is NOT NULL)
      // Therefore use a non-null tombstone value instead of null.
      const newSlug = `deleted-${userId}-${stamp}`;
      const anonymizedProfileDisplayName = `Deleted User ${userId}`;

      await profileRepo.update(
        { userId: userId as any } as any,
        {
          displayName: anonymizedProfileDisplayName as any,
          bio: null as any,
          avatarUrl: null as any,
          coverUrl: null as any,
          slug: newSlug as any,
          isActive: false as any,
        } as any,
      );

      // mark completed + scrub request-side technical identifiers
      reqRow.status = "completed";
      reqRow.completedAt = new Date();
      reqRow.ip = null;
      reqRow.userAgent = null;
      await reqRepo.save(reqRow);

      return { ok: true, requestId: reqRow.id, completed: true };
    });
  }
}