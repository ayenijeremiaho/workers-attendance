import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../admin/guard/admin.guard';
import { RequiresPermission } from '../../admin/decorator/requires-permission.decorator';
import { AdminPermission } from '../../admin/enum/admin-permission.enum';
import { EmailLogService } from '../service/email-log.service';
import { PaginationResponseDto } from '../dto/pagination-response.dto';
import { EmailLog } from '../entity/email-log.entity';
import { EmailLogQueryDto } from '../dto/email-log-query.dto';

@UseGuards(AdminGuard)
@RequiresPermission(AdminPermission.EMAIL_LOGS_READ)
@Controller('admin/email-logs')
export class EmailLogController {
  constructor(private readonly emailLogService: EmailLogService) {}

  @Get()
  async getAll(
    @Query() query: EmailLogQueryDto,
  ): Promise<PaginationResponseDto<EmailLog>> {
    const { page = 1, limit = 20, recipient, status, dateFrom, dateTo } = query;
    return this.emailLogService.findAll(page, limit, {
      recipient,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }
}
