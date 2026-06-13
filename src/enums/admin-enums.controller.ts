import {Controller, Get, UseGuards} from '@nestjs/common';
import {AdminGuard} from '../admin/guard/admin.guard';
import {RequiresPermission} from '../admin/decorator/requires-permission.decorator';
import {AdminPermission, AdminPermissionLabels} from '../admin/enum/admin-permission.enum';
import {toEnumOptions} from '../utility/types/enum-option.type';

@UseGuards(AdminGuard)
@Controller('admin/enums')
export class AdminEnumsController {
    @RequiresPermission(AdminPermission.ADMIN_READ)
    @Get()
    getAll() {
        return {
            permissions: toEnumOptions(AdminPermission, AdminPermissionLabels),
        };
    }
}
