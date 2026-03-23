import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AccountDeletionService } from "./account-deletion.service";
import { RequestAccountDeletionDto } from "./dtos/request-account-deletion.dto";
import { ConfirmAccountDeletionDto } from "./dtos/confirm-account-deletion.dto";

@Controller("account-deletion")
export class AccountDeletionController {
  constructor(private readonly svc: AccountDeletionService) {}

  private getUserIdFromReq(req: any): number {
    const u = req?.user ?? {};
    const v = u.userId ?? u.sub ?? u.id ?? null;
    const id = Number(v);
    return Number.isFinite(id) ? id : 0;
  }

  @UseGuards(JwtAuthGuard)
  @Post("request")
  async request(@Req() req: any, @Body() dto: RequestAccountDeletionDto) {
    const userId = this.getUserIdFromReq(req);
    if (!userId) throw new BadRequestException("invalid_user");

    const ip =
      (req?.headers?.["x-forwarded-for"] as string) ||
      (req?.ip as string) ||
      null;

    const ua = (req?.headers?.["user-agent"] as string) || null;

    return this.svc.requestDeletion({
      userId,
      reason: dto?.reason ?? null,
      ip,
      userAgent: ua,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("confirm")
  async confirm(@Req() req: any, @Body() dto: ConfirmAccountDeletionDto) {
    const userId = this.getUserIdFromReq(req);
    if (!userId) throw new BadRequestException("invalid_user");

    return this.svc.confirmDeletion({
      userId,
      password: dto?.password,
      reason: dto?.reason ?? null,
    });
  }
}