import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class DevEndpointGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    // Gate dev endpoints by secret (works in any env)
    const headerSecret = String(req?.headers?.['x-dev-seed-secret'] || '').trim();
    const envSecret = String(process.env.DEV_SEED_SECRET || '').trim();

    if (!envSecret) {
      throw new UnauthorizedException('dev_seed_secret_missing');
    }

    if (!headerSecret || headerSecret !== envSecret) {
      throw new UnauthorizedException('dev_seed_secret_invalid');
    }

    return true;
  }
}