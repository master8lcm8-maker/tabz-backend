import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpStatusBodySyncFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res: any = ctx.getResponse();

    const httpStatus = exception.getStatus();
    const payload = exception.getResponse();

        // Lockdown: only allow syncing when THIS is our structured payload shape.
    // This prevents arbitrary payloads from forcing transport status.
    let synced = httpStatus;
    if (payload && typeof payload === 'object') {
      const p: any = payload as any;
      const msg = String(p.message ?? '');
      const allowed = msg === 'cashout_failed' || msg === 'm31_2_probe';
      if (allowed) {
        const s = Number(p.status);
        if (Number.isFinite(s) && s > 0) synced = s;
      }
    }

    res.status(synced).json(payload);
  }
}

