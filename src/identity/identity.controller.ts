import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { IdentityService, VerifyStatus } from "./identity.service";

@UseGuards(AuthGuard("jwt"))
@Controller("identity")
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post("start")
  async start(@Req() req: any) {
    const userId = req?.user?.sub ?? req?.user?.id;
    return this.identityService.start(userId);
  }

  @Get("status")
  async status(@Req() req: any) {
    const userId = req?.user?.sub ?? req?.user?.id;
    return this.identityService.getStatus(userId);
  }

  // =========================================================
  // DEV ONLY: lets us simulate provider status updates
  // =========================================================
  @Post("dev-set-status")
  async devSetStatus(
    @Req() req: any,
    @Body() body: { status?: VerifyStatus }
  ) {
    const userId = req?.user?.sub ?? req?.user?.id;
    const next = body?.status;

    if (!next) {
      return { ok: false, error: "Missing body.status" };
    }

    // allow only known statuses
    const allowed: VerifyStatus[] = [
      "required",
      "started",
      "pending",
      "verified",
      "failed",
    ];
    if (!allowed.includes(next)) {
      return { ok: false, error: `Invalid status: ${String(next)}` };
    }

    this.identityService.setStatus(userId, next);
    return { ok: true, userId, status: next };
  }

  // =========================================================
  // DEV ONLY: simulate successful provider completion
  // =========================================================
  @Post("dev-complete")
  async devComplete(@Req() req: any) {
    const userId = req?.user?.sub ?? req?.user?.id;
    return this.identityService.completeDev(userId);
  }
}
