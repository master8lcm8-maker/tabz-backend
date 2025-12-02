import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * This guard ensures that the logged-in user is the OWNER of the venue
 * for endpoints that require venue-ownership authorization.
 *
 * It expects the controller route to set:
 *    @SetMetadata('ownerOnly', true)
 */
@Injectable()
export class VenueOwnerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isOwnerOnly = this.reflector.get<boolean>(
      'ownerOnly',
      context.getHandler(),
    );

    if (!isOwnerOnly) return true; // Route does not need ownership check

    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT

    if (!user) {
      throw new ForbiddenException('No user on request');
    }

    const venue = request.venue; // we attach this earlier in the request chain

    if (!venue) {
      throw new ForbiddenException('Venue not resolved');
    }

    if (venue.ownerId !== user.userId) {
      throw new ForbiddenException(
        'Only the venue owner can perform this action',
      );
    }

    return true;
  }
}
