import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { FreeboardService } from './freeboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

function getUserIdFromRequest(req: Request): number {
  const user: any = (req as any).user || {};
  const rawId = user.sub ?? user.id ?? user.userId;
  const idNum = Number(rawId);
  if (!idNum || Number.isNaN(idNum)) {
    throw new Error('Invalid user id in JWT');
  }
  return idNum;
}

class CreateFreeboardDropDto {
  venueId: number;
  message: string;
  expiresInMinutes?: number;
}

@Controller('freeboard')
export class FreeboardController {
  constructor(private readonly freeboardService: FreeboardService) {}

  // Create a new FreeBoard drop at a venue
  @UseGuards(JwtAuthGuard)
  @Post('drops')
  async createDrop(@Req() req: Request, @Body() body: CreateFreeboardDropDto) {
    const creatorId = getUserIdFromRequest(req);
    const { venueId, message, expiresInMinutes } = body;

    return this.freeboardService.createDrop(
      creatorId,
      venueId,
      message,
      expiresInMinutes ?? 60,
    );
  }

  // Claim a drop by code
  @UseGuards(JwtAuthGuard)
  @Post('claim')
  async claim(@Req() req: Request, @Body('code') code: string) {
    const userId = getUserIdFromRequest(req);
    return this.freeboardService.claimDrop(code, userId);
  }

  // List ACTIVE drops for a venue (public)
  @Get('venue/:venueId')
  async getVenueDrops(@Param('venueId') venueIdParam: string) {
    const venueId = Number(venueIdParam);
    return this.freeboardService.getDropsForVenue(venueId);
  }

  // List drops I created
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyDrops(@Req() req: Request) {
    const creatorId = getUserIdFromRequest(req);
    return this.freeboardService.getDropsForCreator(creatorId);
  }
}
