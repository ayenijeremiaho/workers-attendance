import {SetMetadata} from '@nestjs/common';
import {AdminPermission} from '../enum/admin-permission.enum';

export const REQUIRES_PERMISSION_KEY = 'requires_permission';

export const RequiresPermission = (permission: AdminPermission) =>
    SetMetadata(REQUIRES_PERMISSION_KEY, permission);
