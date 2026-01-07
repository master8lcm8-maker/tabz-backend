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

    // Hard disable in production
    const env = String(process.env.NODE_ENV || '').toLowerCase();
    if (env === 'production') {
      throw new UnauthorizedException('dev_endpoint_disabled');
    }

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
