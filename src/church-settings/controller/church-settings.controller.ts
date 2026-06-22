import {Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, UseGuards} from '@nestjs/common';
import {AdminGuard} from '../../admin/guard/admin.guard';
import {RequiresPermission} from '../../admin/decorator/requires-permission.decorator';
import {AdminPermission} from '../../admin/enum/admin-permission.enum';
import {CurrentAdmin} from '../../admin/decorator/current-admin.decorator';
import {Admin} from '../../admin/entity/admin.entity';
import {ChurchSettingsService} from '../service/church-settings.service';
import {UpdateChurchSettingDto} from '../dto/church-setting.dto';

@UseGuards(AdminGuard)
@Controller('admin/settings')
export class ChurchSettingsController {
    constructor(private readonly churchSettingsService: ChurchSettingsService) {}

    @Get()
    findAll() {
        return this.churchSettingsService.findAll();
    }

    @Get(':key')
    findOne(@Param('key') key: string) {
        return this.churchSettingsService.findOne(key);
    }

    @RequiresPermission(AdminPermission.ADMIN_WRITE)
    @HttpCode(HttpStatus.OK)
    @Patch(':key')
    upsert(@Param('key') key: string, @Body() dto: UpdateChurchSettingDto, @CurrentAdmin() admin: Admin) {
        return this.churchSettingsService.upsert(key, dto, admin.member?.id);
    }
}
