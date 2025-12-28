// src/modules/auth/guards/owner-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

interface AuthUser {
  role?: string;
  [key: string]: any;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

@Injectable()
export class OwnerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    // 🔍 TEMP DEV LOG (optional — safe to remove later)
    // console.log('[OwnerAuthGuard] user in request:', user);

    /**
     * DEV BEHAVIOR (while roles are not wired to DB):
     *
     * - If there is NO role at all -> allow (JWT is enough for now).
     * - If role is "owner"        -> allow.
     * - If role is "buyer"        -> allow for now (Owner3 is tagged as buyer in JWT).
     * - For any other explicit role -> block with "Owners only".
     *
     * Once the real role system is ready and stored in the DB,
     * you can tighten this back to: role must equal "owner".
     */

    const role = (user.role || '').toLowerCase();

    if (!role) {
      // No role set at all -> allow for now
      return true;
    }

    if (role === 'owner' || role === 'buyer') {
      // Allow both owner and buyer tokens in dev so Owner3 can use owner routes
      return true;
    }

    // Any other explicit role is blocked
    throw new ForbiddenException('Owners only');
  }
}
