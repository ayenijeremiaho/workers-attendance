import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import {AdminRoleService} from '../service/admin-role.service';
import {CreateAdminRoleDto, UpdateAdminRoleDto} from '../dto/admin-role.dto';
import {AdminGuard} from '../guard/admin.guard';
import {RequiresPermission} from '../decorator/requires-permission.decorator';
import {AdminPermission} from '../enum/admin-permission.enum';
import {CurrentUser} from '../../auth/decorator/current-user.decorator';
import {MemberAuth} from '../../auth/interface/auth.interface';

@UseGuards(AdminGuard)
@Controller('admin/roles')
export class AdminRoleController {
    constructor(private readonly adminRoleService: AdminRoleService) {
    }

    @RequiresPermission(AdminPermission.ADMIN_READ)
    @Get()
    getAll() {
        return this.adminRoleService.getAll();
    }

    @RequiresPermission(AdminPermission.ADMIN_READ)
    @Get(':id')
    getOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.adminRoleService.getById(id);
    }

    @RequiresPermission(AdminPermission.ADMIN_WRITE)
    @Post()
    create(@Body() dto: CreateAdminRoleDto, @CurrentUser() user: MemberAuth) {
        return this.adminRoleService.create(dto, user.id);
    }

    @RequiresPermission(AdminPermission.ADMIN_WRITE)
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAdminRoleDto,
        @CurrentUser() user: MemberAuth,
    ) {
        return this.adminRoleService.update(id, dto, user.id);
    }

    @RequiresPermission(AdminPermission.ADMIN_WRITE)
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: MemberAuth) {
        await this.adminRoleService.delete(id, user.id);
    }
}
