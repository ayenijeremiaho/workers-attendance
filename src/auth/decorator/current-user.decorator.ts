import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { MemberAuth } from '../interface/auth.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MemberAuth => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
