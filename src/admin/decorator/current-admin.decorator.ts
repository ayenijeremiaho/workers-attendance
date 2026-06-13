import {createParamDecorator, ExecutionContext} from '@nestjs/common';
import {Admin} from '../entity/admin.entity';

export const CurrentAdmin = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): Admin => {
        const request = ctx.switchToHttp().getRequest();
        return request.admin;
    },
);
