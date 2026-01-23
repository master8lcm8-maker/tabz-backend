import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class DevSeedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const headerSecret = String(req.headers['x-dev-seed-secret'] || '').trim();
    const envSecret = String(process.env.DEV_SEED_SECRET || '').trim();

    // R5 instrumentation (safe): presence + length only (never log the value)
    console.log('[DEV_SEED]', {
      present: !!envSecret,
      len: envSecret ? envSecret.length : 0,
    });

    if (!envSecret) {
      throw new UnauthorizedException('dev_seed_secret_missing');
    }

    if (!headerSecret || headerSecret !== envSecret) {
      throw new UnauthorizedException('dev_seed_secret_invalid');
    }

    return true;
  }
}
