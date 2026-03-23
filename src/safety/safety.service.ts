import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBlock } from './block.entity';
import { UserReport, ReportTargetType } from './report.entity';
import { AuditEvent, AuditTargetType } from './audit.entity';

@Injectable()
export class SafetyService {
  constructor(
    @InjectRepository(UserBlock)
    private readonly blockRepo: Repository<UserBlock>,

    @InjectRepository(UserReport)
    private readonly reportRepo: Repository<UserReport>,

    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
  ) {}

  // ----------------------------
  // BLOCKING
  // ----------------------------
  async isBlocked(aUserId: number, bUserId: number): Promise<boolean> {
    const a = Number(aUserId);
    const b = Number(bUserId);
    if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b <= 0) return false;

    const row = await this.blockRepo.findOne({
      where: [
        { blockerUserId: a, blockedUserId: b } as any,
        { blockerUserId: b, blockedUserId: a } as any,
      ],
    });

    return !!row;
  }

  async block(blockerUserId: number, blockedUserId: number) {
    const blocker = Number(blockerUserId);
    const blocked = Number(blockedUserId);
    if (!Number.isFinite(blocked) || blocked <= 0) throw new BadRequestException('invalid_target_user');
    if (blocker === blocked) throw new BadRequestException('cannot_block_self');

    // idempotent create
    const existing = await this.blockRepo.findOne({
      where: { blockerUserId: blocker, blockedUserId: blocked } as any,
    });
    if (!existing) {
      await this.blockRepo.save(
        this.blockRepo.create({ blockerUserId: blocker, blockedUserId: blocked }),
      );
    }

    await this.appendAudit(blocker, 'user_block', 'USER', String(blocked), { blockedUserId: blocked });
    return { ok: true };
  }

  async unblock(blockerUserId: number, blockedUserId: number) {
    const blocker = Number(blockerUserId);
    const blocked = Number(blockedUserId);
    if (!Number.isFinite(blocked) || blocked <= 0) throw new BadRequestException('invalid_target_user');

    await this.blockRepo.delete({ blockerUserId: blocker, blockedUserId: blocked } as any);
    await this.appendAudit(blocker, 'user_unblock', 'USER', String(blocked), { blockedUserId: blocked });
    return { ok: true };
  }

  async listBlocksForUser(userId: number) {
    const uid = Number(userId);
    const rows = await this.blockRepo.find({
      where: { blockerUserId: uid } as any,
      order: { createdAt: 'DESC' as any },
    });

    // NOTE: Controller may project this to slugs; keep service raw & deterministic.
    return { ok: true, items: rows.map(r => ({ blockedUserId: r.blockedUserId, createdAt: r.createdAt })) };
  }

  // ----------------------------
  // REPORTING
  // ----------------------------
  async report(params: {
    reporterUserId: number;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
    metadata?: any;
  }) {
    const reporter = Number(params.reporterUserId);
    const targetType = String(params.targetType || '').toUpperCase() as ReportTargetType;
    const targetId = String(params.targetId || '').trim();
    const reason = String(params.reason || '').trim();

    if (!targetId) throw new BadRequestException('invalid_target_id');
    if (!reason || reason.length < 3) throw new BadRequestException('invalid_reason');

    const allowed = new Set<ReportTargetType>(['USER', 'DM_THREAD', 'DM_MESSAGE', 'WISHLIST', 'OTHER']);
    if (!allowed.has(targetType)) throw new BadRequestException('invalid_target_type');

    const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;

    await this.reportRepo.save(
      this.reportRepo.create({
        reporterUserId: reporter,
        targetType,
        targetId,
        reason,
        metadataJson,
      }),
    );

    await this.appendAudit(reporter, 'user_report', targetType as any, targetId, { reason });
    return { ok: true };
  }

  // ✅ NEW: self-only report listing (public-safe projection)
  async listReportsForUser(reporterUserId: number) {
    const uid = Number(reporterUserId);
    if (!Number.isFinite(uid) || uid <= 0) throw new ForbiddenException('invalid_auth');

    const rows = await this.reportRepo.find({
      where: { reporterUserId: uid } as any,
      order: { createdAt: 'DESC' as any }, // deterministic
    });

    // Public-safe: no internal ids, no reporterUserId, no metadataJson
    return {
      ok: true,
      items: (rows || []).map((r: any) => ({
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        createdAt: r.createdAt,
      })),
    };
  }

  // ----------------------------
  // ENFORCEMENT HELPER
  // ----------------------------
  async assertNotBlocked(actorUserId: number, otherUserId: number) {
    const blocked = await this.isBlocked(actorUserId, otherUserId);
    if (blocked) {
      throw new ForbiddenException('blocked');
    }
  }

  // ----------------------------
  // AUDIT
  // ----------------------------
  async appendAudit(
    actorUserId: number,
    action: string,
    targetType: AuditTargetType,
    targetId: string,
    metadata?: any,
  ) {
    const actor = Number(actorUserId);
    const a = String(action || '').trim();
    const t = String(targetType || 'OTHER').trim().toUpperCase() as AuditTargetType;
    const tid = String(targetId || '').trim();

    if (!actor || !a || !tid) return;

    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: actor,
        action: a,
        targetType: t,
        targetId: tid,
        metadataJson,
      }),
    );
  }
}
