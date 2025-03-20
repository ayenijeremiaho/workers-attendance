import { UserType } from '../../user/enums/user-type';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserType[]) => import("@nestjs/common").CustomDecorator<string>;
