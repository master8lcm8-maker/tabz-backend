// src/safety/safety.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { SafetyService } from './safety.service';
import { ProfileService } from '../profile/profile.service';

@Controller('safety')
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(
    private readonly safety: SafetyService,
    private readonly profiles: ProfileService,
  ) {}

  private getUserId(req: any): number {
    const u = req?.user ?? {};
    const v = u.userId ?? u.sub ?? u.id ?? null;
    const userId = Number(v);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new ForbiddenException('invalid_auth');
    }
    const role = String(u.role || '').toLowerCase();
    if (role !== 'buyer' && role !== 'owner') {
      throw new ForbiddenException('forbidden');
    }
    return userId;
  }

  // ----------------------------------------
  // BLOCK/UNBLOCK (by userId) — existing
  // ----------------------------------------

  @Post('block/:userId(\\d+)')
  async block(@Req() req: any, @Param('userId') userId: string) {
    const blocker = this.getUserId(req);
    const blocked = Number(userId);
    return this.safety.block(blocker, blocked);
  }

  @Delete('block/:userId(\\d+)')
  async unblockByUserId(@Req() req: any, @Param('userId') userId: string) {
    const blocker = this.getUserId(req);
    const blocked = Number(userId);
    return this.safety.unblock(blocker, blocked);
  }

  // ----------------------------------------
  // BLOCK/UNBLOCK (by profile slug)
  // ----------------------------------------

  @Post('block')
  async blockBySlug(
    @Req() req: any,
    @Body() body: { targetProfileSlug?: string; reason?: string },
  ) {
    const blocker = this.getUserId(req);

    const slug = String(body?.targetProfileSlug || '').trim();
    if (!slug) throw new BadRequestException('invalid_target');

    // resolve slug -> profile -> userId (no leaking in response)
    const target = await this.profiles.getBySlug(slug);
    if (!target?.userId) throw new BadRequestException('invalid_target');

    // prevent self-block
    if (Number(target.userId) === Number(blocker)) {
      throw new BadRequestException('cannot_block_self');
    }

    return this.safety.block(blocker, Number(target.userId));
  }

  @Post('unblock')
  async unblockBySlug(
    @Req() req: any,
    @Body() body: { targetProfileSlug?: string },
  ) {
    const blocker = this.getUserId(req);

    const slug = String(body?.targetProfileSlug || '').trim();
    if (!slug) throw new BadRequestException('invalid_target');

    const target = await this.profiles.getBySlug(slug);
    if (!target?.userId) throw new BadRequestException('invalid_target');

    if (Number(target.userId) === Number(blocker)) {
      throw new BadRequestException('invalid_target');
    }

    return this.safety.unblock(blocker, Number(target.userId));
  }

  // ----------------------------------------
  // LIST
  // ----------------------------------------

  @Get('blocks')
  async myBlocks(@Req() req: any) {
    const me = this.getUserId(req);
    return this.safety.listBlocksForUser(me);
  }

  // ✅ NEW: LIST MY REPORTS (self-only, public-safe)
  @Get('reports')
  async myReports(@Req() req: any) {
    const me = this.getUserId(req);
    return this.safety.listReportsForUser(me);
  }

  // ----------------------------------------
  // REPORT
  // ----------------------------------------

  @Post('report')
  async report(
    @Req() req: any,
    @Body()
    body: {
      targetType: 'USER' | 'DM_THREAD' | 'DM_MESSAGE' | 'WISHLIST' | 'OTHER';
      targetId: string;
      reason: string;
      metadata?: any;
    },
  ) {
    const me = this.getUserId(req);

    const targetType = String(body?.targetType || '').toUpperCase();
    const targetId = String(body?.targetId || '').trim();
    const reason = String(body?.reason || '').trim();

    if (!targetType || !targetId || !reason) {
      throw new BadRequestException('invalid_report');
    }

    return this.safety.report({
      reporterUserId: me,
      targetType: targetType as any,
      targetId,
      reason,
      metadata: body?.metadata ?? null,
    });
  }
}
