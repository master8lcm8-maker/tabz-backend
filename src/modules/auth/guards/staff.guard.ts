import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Missing authentication');
    }

    // Must be a staff token
    if (user.type !== 'STAFF') {
      throw new ForbiddenException('Only staff accounts can perform this action');
    }

    return true;
  }
}
