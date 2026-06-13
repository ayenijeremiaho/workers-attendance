import {Controller, Get, Query, UseGuards} from '@nestjs/common';
import {AdminGuard} from '../../admin/guard/admin.guard';
import {RequiresPermission} from '../../admin/decorator/requires-permission.decorator';
import {AdminPermission} from '../../admin/enum/admin-permission.enum';
import {AuditAction, AuditLogService} from '../service/audit-log.service';
import {PaginationResponseDto} from '../dto/pagination-response.dto';
import {AuditLog} from '../entity/audit-log.entity';

@UseGuards(AdminGuard)
@RequiresPermission(AdminPermission.AUDIT_READ)
@Controller('admin/audit-logs')
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) {
    }

    @Get()
    async getAll(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('action') action?: AuditAction,
        @Query('actorId') actorId?: string,
        @Query('targetId') targetId?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ): Promise<PaginationResponseDto<AuditLog>> {
        return this.auditLogService.findAll(+page, +limit, {
            action,
            actorId,
            targetId,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
        });
    }
}
