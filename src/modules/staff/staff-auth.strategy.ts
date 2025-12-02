import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { StaffService } from './staff.service';

/**
 * Staff Auth Strategy
 * -------------------
 * Staff tokens are NOT signed JWT.
 * They follow the format:
 *
 *    STAFF::<staffId>::venueId
 *
 * This strategy validates:
 *   - token prefix
 *   - staff exists
 *   - staff belongs to venue
 */
@Injectable()
export class StaffAuthStrategy extends PassportStrategy(
  Strategy,
  'staff-auth',
) {
  constructor(private readonly staffService: StaffService) {
    super();
  }

  async validate(req: any): Promise<any> {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing staff authorization');
    }

    const token = authHeader.replace('Bearer ', '').trim();

    // Expect STAFF::<staffId>::venueId
    if (!token.startsWith('STAFF::')) {
      throw new UnauthorizedException('Invalid staff token format');
    }

    const parts = token.split('::');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed staff token');
    }

    const staffId = Number(parts[1]);
    const venueId = Number(parts[2]);

    if (Number.isNaN(staffId) || Number.isNaN(venueId)) {
      throw new UnauthorizedException('Invalid staff token values');
    }

    const staff = await this.staffService.getStaffForVenue(venueId);

    const match = staff.find((s) => s.id === staffId);
    if (!match) {
      throw new UnauthorizedException('Staff not found or mismatched venue');
    }

    // What we attach to req.user
    return {
      staffId,
      venueId,
    };
  }
}
