import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreditsService } from './credits.service';

@Controller('credits')
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  private getUserId(req: any): number {
    const id = Number(req?.user?.sub || req?.user?.userId || req?.user?.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('invalid_user');
    }
    return id;
  }

  @UseGuards(JwtAuthGuard)
  @Get('balance')
  async balance(@Req() req: any) {
    const userId = this.getUserId(req);
    const balanceCents = await this.credits.getBalanceCents(userId);
    return { ok: true, userId, balanceCents };
  }

  @UseGuards(JwtAuthGuard)
  @Post('transfer')
  async transfer(
    @Req() req: any,
    @Body() body: { toUserId: number; amountCents: number; note?: string },
  ) {
    const fromUserId = this.getUserId(req);
    const toUserId = Number(body?.toUserId);
    const amountCents = Number(body?.amountCents);

    if (!Number.isFinite(toUserId) || toUserId <= 0) {
      throw new BadRequestException('invalid_to_user');
    }
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new BadRequestException('invalid_amount');
    }
    if (toUserId === fromUserId) {
      throw new BadRequestException('cannot_transfer_to_self');
    }

    const transfer = await this.credits.transferCredits({
      fromUserId,
      toUserId,
      amountCents,
      note: body?.note,
    });

    return { ok: true, transfer };
  }

  @UseGuards(JwtAuthGuard)
  @Post('requests')
  async createRequest(
    @Req() req: any,
    @Body() body: { amountCents: number; note?: string },
  ) {
    const requesterUserId = this.getUserId(req);
    const amountCents = Number(body?.amountCents);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new BadRequestException('invalid_amount');
    }

    const request = await this.credits.createRequest({
      requesterUserId,
      amountCents,
      note: body?.note,
    });

    return { ok: true, request };
  }

  
  // Read a single request (requester OR a funder can see it)
  @UseGuards(JwtAuthGuard)
  @Get('requests/:id')
  async getRequest(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const requestId = Number(id);
    if (!Number.isFinite(requestId) || requestId <= 0) throw new BadRequestException('invalid_request_id');

    const request = await this.credits.getRequestForUser(userId, requestId);
    return { ok: true, request };
  }

@UseGuards(JwtAuthGuard)
  @Post('requests/:id/fund')
  async fundRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { amountCents: number },
  ) {
    const funderUserId = this.getUserId(req);
    const requestId = Number(id);
    const amountCents = Number(body?.amountCents);

    if (!Number.isFinite(requestId) || requestId <= 0) {
      throw new BadRequestException('invalid_request_id');
    }
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new BadRequestException('invalid_amount');
    }

    const updated = await this.credits.fundRequest({
      requestId,
      funderUserId,
      amountCents,
    });

    return { ok: true, request: updated };
  }

  // DEV ONLY: mint credits (used for testing funding flows)
  @UseGuards(JwtAuthGuard)
  @Post('dev/mint')
  async devMint(
    @Req() req: any,
    @Body() body: { toUserId: number; amountCents: number },
  ) {
    // caller is authenticated; we don't care who they are for dev mint, but we validate inputs
    this.getUserId(req);

    const toUserId = Number(body?.toUserId);
    const amountCents = Number(body?.amountCents);

    if (!Number.isFinite(toUserId) || toUserId <= 0) throw new BadRequestException('invalid_to_user');
    if (!Number.isFinite(amountCents) || amountCents <= 0) throw new BadRequestException('invalid_amount');

    const minted = await this.credits.devMintCredits({ toUserId, amountCents });
    return { ok: true, minted };
  }
}

