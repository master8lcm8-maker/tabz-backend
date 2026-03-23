import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { FreeboardService } from "./freeboard.service";
import { CreateDropDto } from "./dto/create-drop.dto";
import { ClaimDropDto } from "./dto/claim-drop.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("freeboard")
export class FreeboardController {
  constructor(
    private readonly freeboardService: FreeboardService,
  ) {}

  @Post("drop")
  @UseGuards(JwtAuthGuard)
  async createDrop(
    @Req() req: any,
    @Body() body: CreateDropDto,
  ) {
    const creatorId = Number(
      req.user?.sub ?? req.user?.id ?? req.user?.userId,
    );

    return this.freeboardService.createDrop({
      venueId: body.venueId,
      catalogItemId: body.catalogItemId,
      creatorId,
      quantity: body.quantity,
      maxClaimsPerUser: body.maxClaimsPerUser,
      expiresAt: new Date(body.expiresAt),
      displayMode: body.displayMode,
    });
  }

  @Post("claim")
  @UseGuards(JwtAuthGuard)
  async claimDrop(
    @Req() req: any,
    @Body() body: ClaimDropDto,
  ) {
    const userId = Number(
      req.user?.sub ?? req.user?.id ?? req.user?.userId,
    );

    return this.freeboardService.claimDrop({
      dropId: body.dropId,
      userId,
    });
  }

  @Get("venue/:venueId")
  @UseGuards(JwtAuthGuard)
  async getDropsForVenue(
    @Param("venueId") venueId: number,
    @Req() req: any,
  ) {
    const viewerUserId = Number(
      req.user?.sub ?? req.user?.id ?? req.user?.userId,
    );
    const viewerVenueId = req.user?.venueId != null ? Number(req.user?.venueId) : null;
    const role = String(req.user?.role ?? "").toLowerCase();

    return this.freeboardService.getDropsForVenue(
      Number(venueId),
      viewerUserId,
      viewerVenueId,
      role,
    );
  }

  @Get("creator/:creatorId")
  @UseGuards(JwtAuthGuard)
  async getDropsForCreator(
    @Param("creatorId") creatorId: number,
    @Req() req: any,
  ) {
    const viewerUserId = Number(
      req.user?.sub ?? req.user?.id ?? req.user?.userId,
    );

    return this.freeboardService.getDropsForCreator(
      Number(creatorId),
      viewerUserId,
    );
  }
}
