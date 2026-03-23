// src/app/dev-endpoint.guard.ts
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

    // Headers in Node are lowercased by default
    const headerRaw = req?.headers?.['x-dev-seed-secret'];
    const headerSecret = String(headerRaw ?? '').trim();

    const envRaw = process.env.DEV_SEED_SECRET;
    const envSecret = String(envRaw ?? '').trim();

    // SAFE instrumentation: never log the secret values, only presence + lengths
    // This proves: (a) env exists (b) header arrives (c) lengths match
    try {
      console.log('[DEV_ENDPOINT_GUARD]', {
        path: req?.originalUrl || req?.url || null,
        envPresent: !!envSecret,
        envLen: envSecret.length,
        headerPresent: !!headerSecret,
        headerLen: headerSecret.length,
      });
    } catch {}

    if (!envSecret) {
      throw new UnauthorizedException('dev_seed_secret_missing');
    }

    if (!headerSecret || headerSecret !== envSecret) {
      throw new UnauthorizedException('dev_seed_secret_invalid');
    }

    return true;
  }
}
