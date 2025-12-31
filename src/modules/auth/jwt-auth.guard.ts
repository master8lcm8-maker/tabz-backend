// src/modules/auth/jwt-auth.guard.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: any) {
    const req = context?.switchToHttp?.().getRequest?.();

    // Grab header safely
    const authHeader =
      req?.headers?.authorization ||
      req?.headers?.Authorization ||
      req?.headers?.AUTHORIZATION;

    // If passport rejected, print WHY (this is the missing proof)
    if (err || !user) {
      const infoMsg =
        typeof info === 'string'
          ? info
          : info?.message || info?.name || JSON.stringify(info);

      // ✅ This line is the one you will paste back to me
      // It will say exactly what passport-jwt is rejecting (invalid signature, malformed, etc.)
      console.log('[JwtAuthGuard] REJECT', {
        path: req?.originalUrl || req?.url,
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: typeof authHeader === 'string' ? authHeader.slice(0, 20) : null,
        err: err?.message || err,
        info: infoMsg,
      });

      throw err || new UnauthorizedException(infoMsg || 'Unauthorized');
    }

    // Optional: prove accept once it works
    console.log('[JwtAuthGuard] ACCEPT', {
      path: req?.originalUrl || req?.url,
      userId: user?.id ?? user?.userId ?? user?.sub,
      role: user?.role ?? null,
      venueId: user?.venueId ?? null,
    });

    return user;
  }
}
