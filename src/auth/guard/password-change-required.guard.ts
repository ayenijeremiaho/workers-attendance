import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_ROUTE } from '../decorator/public.decorator';
import { SKIP_PASSWORD_CHANGE_CHECK } from '../decorator/skip-password-change-check.decorator';

@Injectable()
export class PasswordChangeRequiredGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_PASSWORD_CHANGE_CHECK,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.requiresPasswordChange) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: 'PASSWORD_CHANGE_REQUIRED',
          message:
            'Your account was created with a temporary password. Please change your password before continuing.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
