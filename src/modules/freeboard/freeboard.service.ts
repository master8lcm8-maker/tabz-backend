import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, MoreThan, Not, Repository } from "typeorm";
import { FreeboardItem } from "./entities/freeboard-item.entity";
import { FreeboardClaim } from "./entities/freeboard-claim.entity";
import { CatalogService } from "../catalog/catalog.service";
import { VenuesService } from "../venues/venues.service";
import { NotificationsService } from "../notifications/notifications.service";
import { RedemptionsService } from "../redemptions/redemptions.service";
import { VenuePresenceService } from "../venue-presence/venue-presence.service";
import { Redemption } from "../redemptions/entities/redemption.entity";

@Injectable()
export class FreeboardService {
  constructor(
    @InjectRepository(FreeboardItem)
    private readonly freeboardRepository: Repository<FreeboardItem>,
    @InjectRepository(FreeboardClaim)
    private readonly freeboardClaimsRepository: Repository<FreeboardClaim>,
    @InjectRepository(Redemption)
    private readonly redemptionsRepository: Repository<Redemption>,
    private readonly catalogService: CatalogService,
    @Inject(forwardRef(() => VenuesService))
    private readonly venuesService: VenuesService,
    private readonly notificationsService: NotificationsService,
    private readonly redemptionsService: RedemptionsService,
    private readonly venuePresenceService: VenuePresenceService,
  ) {}

  async createDrop(
    data: Partial<FreeboardItem> & {
      creatorId?: number;
      title?: string;
      code?: string;
    },
  ) {
    const venueId = Number(data.venueId);
    const catalogItemId = Number(data.catalogItemId);
    const droppedByUserId = Number(data.droppedByUserId ?? data.creatorId);
    const quantity = Number(data.quantity ?? 1);
    const maxClaimsPerUser =
      data.maxClaimsPerUser != null ? Number(data.maxClaimsPerUser) : null;
    const expiresAt = data.expiresAt as Date;

    if (!droppedByUserId) {
      throw new BadRequestException("creator_required");
    }

    if (!venueId) {
      throw new BadRequestException("venue_required");
    }

    if (!catalogItemId) {
      throw new BadRequestException("catalog_item_required");
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException("quantity_must_be_positive");
    }

    if (
      maxClaimsPerUser != null &&
      (!Number.isFinite(maxClaimsPerUser) || maxClaimsPerUser <= 0)
    ) {
      throw new BadRequestException("max_claims_per_user_must_be_positive");
    }

    if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException("invalid_expires_at");
    }

    if (expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("expires_at_must_be_future");
    }

    const venue = await this.venuesService.findAll().then((rows) =>
      rows.find((v) => v.id === venueId),
    );

    if (!venue) {
      throw new NotFoundException("venue_not_found");
    }

    if (Number(venue.ownerId) !== droppedByUserId) {
      throw new ForbiddenException("venue_not_owned_by_creator");
    }

    if (venue.isPaused) {
      throw new BadRequestException("venue_paused");
    }

    if (!venue.acceptingFreeboard) {
      throw new BadRequestException("venue_not_accepting_freeboard");
    }

    const item = await this.catalogService.getItemById(catalogItemId);
    if (!item) {
      throw new NotFoundException("catalog_item_not_found");
    }

    if (item.venueId !== venueId) {
      throw new BadRequestException("catalog_item_venue_mismatch");
    }

    if (!item.isActive) {
      throw new BadRequestException("catalog_item_inactive");
    }

    if (!item.redeemable) {
      throw new BadRequestException("catalog_item_not_redeemable");
    }

    const availableInventory =
      await this.catalogService.getAvailableInventory(catalogItemId);

    if (
      availableInventory != null &&
      quantity > availableInventory
    ) {
      throw new BadRequestException("drop_quantity_exceeds_inventory");
    }

    const boardItem = this.freeboardRepository.create({
      venueId,
      catalogItemId,
      droppedByUserId,
      giftTransactionId: data.giftTransactionId ?? null,
      displayMode: data.displayMode ?? "named",
      status: data.status ?? "active",
      quantity,
      claimedQuantity: data.claimedQuantity ?? 0,
      maxClaimsPerUser,
      expiresAt,
      claimedAt: data.claimedAt ?? null,
      expiredAt: data.expiredAt ?? null,
    });

    const saved = await this.freeboardRepository.save(boardItem);

    await this.notificationsService.createNotification({
      userId: droppedByUserId,
      type: "freeboard_drop_created",
      title: "FreeBoard drop created",
      body: "Your FreeBoard drop is now live.",
      dataJson: {
        freeboardItemId: saved.id,
        venueId: saved.venueId,
        catalogItemId: saved.catalogItemId,
      },
    });

    return saved;
  }

  async getDropsForVenue(venueId: number, viewerUserId: number, viewerVenueId?: number | null, viewerRole?: string | null) {
    const targetVenueId = Number(venueId);
    const userId = Number(viewerUserId);
    const scopedViewerVenueId =
      viewerVenueId != null ? Number(viewerVenueId) : null;
    const role = String(viewerRole ?? "").toLowerCase();

    if (!targetVenueId) {
      throw new BadRequestException("venue_required");
    }

    if (!userId) {
      throw new BadRequestException("viewer_user_required");
    }

    const venue = await this.venuesService.findAll().then((rows) =>
      rows.find((v) => v.id === targetVenueId),
    );

    if (!venue) {
      throw new NotFoundException("venue_not_found");
    }

    const isOwner = Number(venue.ownerId) === userId;
    const isVenueStaff =
      role === "staff" &&
      !!scopedViewerVenueId &&
      scopedViewerVenueId === targetVenueId;

    const roster = await this.venuePresenceService.getVenueRoster(targetVenueId);
    const isVisibleAtVenue = roster.some((p) => Number(p.userId) === userId);

    if (!isOwner && !isVenueStaff && !isVisibleAtVenue) {
      throw new ForbiddenException("freeboard_venue_forbidden");
    }

    const now = new Date();

    const staleDrops = await this.freeboardRepository.find({
      where: [
        {
          venueId: targetVenueId,
          status: "active",
          expiresAt: LessThan(now),
        },
        {
          venueId: targetVenueId,
          status: "claimed",
          expiresAt: LessThan(now),
        },
      ],
    });

    await this.freeboardRepository.update(
      {
        venueId: targetVenueId,
        status: Not("expired"),
        expiresAt: LessThan(now),
      },
      {
        status: "expired",
        expiredAt: now,
      },
    );

    for (const staleDrop of staleDrops) {
      await this.expirePendingLifecycleForDrop(staleDrop.id);
    }

    return this.freeboardRepository.find({
      where: {
        venueId: targetVenueId,
        status: "active",
        expiresAt: MoreThan(now),
      },
      order: {
        createdAt: "DESC",
      },
    });
  }

  async claimDrop(input: { dropId: number; userId?: number; code?: string }) {
    const userId = input.userId != null ? Number(input.userId) : null;
    if (!userId) {
      throw new BadRequestException("user_required");
    }

    const item = await this.freeboardRepository.findOne({
      where: { id: input.dropId },
    });

    if (!item) {
      throw new NotFoundException("drop_not_found");
    }

    const roster = await this.venuePresenceService.getVenueRoster(item.venueId);
    const claimantPresence = roster.find((p) => Number(p.userId) === userId);

    if (!claimantPresence) {
      throw new BadRequestException("claimant_not_visible_at_venue");
    }

    if (item.maxClaimsPerUser != null) {
      const priorClaims = await this.freeboardClaimsRepository.count({
        where: {
          freeboardItemId: item.id,
          userId,
          claimStatus: "claimed",
        },
      });

      if (priorClaims >= item.maxClaimsPerUser) {
        throw new BadRequestException("drop_max_claims_per_user_reached");
      }
    }

    const now = new Date();

    if (item.status !== "active") {
      throw new BadRequestException("drop_not_active");
    }

    if (item.expiresAt.getTime() <= now.getTime()) {
      await this.freeboardRepository.update(
        { id: item.id },
        {
          status: "expired",
          expiredAt: now,
        },
      );
      await this.expirePendingLifecycleForDrop(item.id);
      throw new BadRequestException("drop_expired");
    }

    const claimResult = await this.freeboardRepository
      .createQueryBuilder()
      .update(FreeboardItem)
      .set({
        claimedQuantity: () => '"claimedQuantity" + 1',
        status: () => `CASE
          WHEN "claimedQuantity" + 1 >= quantity THEN 'claimed'
          ELSE status
        END`,
        claimedAt: () => `CASE
          WHEN "claimedQuantity" + 1 >= quantity THEN NOW()
          ELSE "claimedAt"
        END`,
      })
      .where('id = :id', { id: item.id })
      .andWhere(`status = 'active'`)
      .andWhere(`"expiresAt" > NOW()`)
      .andWhere(`"claimedQuantity" < quantity`)
      .returning('*')
      .execute();

    if (!claimResult.affected) {
      const latest = await this.freeboardRepository.findOne({
        where: { id: item.id },
      });

      if (!latest) {
        throw new NotFoundException("drop_not_found");
      }

      if (latest.status !== "active") {
        throw new BadRequestException(
          latest.status === "expired" ? "drop_expired" : "drop_not_active",
        );
      }

      if (latest.expiresAt.getTime() <= Date.now()) {
        await this.freeboardRepository.update(
          { id: latest.id },
          {
            status: "expired",
            expiredAt: new Date(),
          },
        );
        await this.expirePendingLifecycleForDrop(latest.id);
        throw new BadRequestException("drop_expired");
      }

      if (latest.claimedQuantity >= latest.quantity) {
        throw new BadRequestException("drop_fully_claimed");
      }

      throw new BadRequestException("drop_claim_failed");
    }

    const updated = claimResult.raw?.[0] ?? null;

    const redemption = await this.redemptionsService.createRedemption({
      userId,
      venueId: item.venueId,
      catalogItemId: item.catalogItemId,
      sourceType: "freeboard",
      sourceId: item.id,
    });

    await this.freeboardClaimsRepository.save(
      this.freeboardClaimsRepository.create({
        freeboardItemId: item.id,
        userId,
        venueId: item.venueId,
        redemptionId: redemption?.id ?? null,
        claimStatus: "claimed",
        claimSource: "venue",
      }),
    );

    if (item.droppedByUserId) {
      await this.notificationsService.createNotification({
        userId: item.droppedByUserId,
        type: "freeboard_item_claimed",
        title: "FreeBoard item claimed",
        body: "Someone claimed your FreeBoard item.",
        dataJson: {
          freeboardItemId: item.id,
          claimedByUserId: userId,
          venueId: item.venueId,
          redemptionId: redemption?.id ?? null,
        },
      });
    }

    return {
      freeboardItem: updated,
      redemption,
    };
  }

  async getDropsForCreator(creatorId: number, viewerUserId: number) {
    const ownerId = Number(creatorId);
    const viewerId = Number(viewerUserId);

    if (!ownerId) {
      throw new BadRequestException("creator_id_required");
    }

    if (!viewerId) {
      throw new BadRequestException("viewer_user_required");
    }

    if (ownerId !== viewerId) {
      throw new ForbiddenException("freeboard_creator_history_forbidden");
    }

    return this.freeboardRepository.find({
      where: {
        droppedByUserId: ownerId,
      },
      order: {
        createdAt: "DESC",
      },
    });
  }

  private async expirePendingLifecycleForDrop(dropId: number) {
    const targetDropId = Number(dropId);

    if (!targetDropId) {
      return;
    }

    const pendingRedemptions = await this.redemptionsRepository.find({
      where: {
        sourceType: "freeboard",
        sourceId: targetDropId,
        status: "pending",
      },
    });

    if (!pendingRedemptions.length) {
      return;
    }

    const redemptionIds = pendingRedemptions.map((r) => Number(r.id));

    await this.redemptionsRepository.update(
      {
        sourceType: "freeboard",
        sourceId: targetDropId,
        status: "pending",
      },
      {
        status: "expired",
      },
    );

    await this.catalogService.markReservationsExpired(redemptionIds);

    for (const redemptionId of redemptionIds) {
      await this.freeboardClaimsRepository.update(
        {
          redemptionId,
          claimStatus: "claimed",
        },
        {
          claimStatus: "expired",
        },
      );
    }
  }
}

