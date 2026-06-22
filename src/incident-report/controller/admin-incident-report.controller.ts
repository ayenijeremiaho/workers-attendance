import {Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Query, UseGuards} from '@nestjs/common';
import {AdminGuard} from '../../admin/guard/admin.guard';
import {RequiresPermission} from '../../admin/decorator/requires-permission.decorator';
import {AdminPermission} from '../../admin/enum/admin-permission.enum';
import {CurrentAdmin} from '../../admin/decorator/current-admin.decorator';
import {Admin} from '../../admin/entity/admin.entity';
import {IncidentReportService} from '../service/incident-report.service';
import {UpdateIncidentStatusDto} from '../dto/incident-report.dto';

@UseGuards(AdminGuard)
@Controller('admin/incidents')
export class AdminIncidentReportController {
    constructor(private readonly incidentReportService: IncidentReportService) {}

    @RequiresPermission(AdminPermission.INCIDENT_REPORT_READ)
    @Get()
    async findAll(
        @Query('page', new ParseIntPipe({optional: true})) page = 1,
        @Query('limit', new ParseIntPipe({optional: true})) limit = 20,
    ) {
        const result = await this.incidentReportService.findAll(page, limit);
        return {
            ...result,
            data: result.data.map(r => this.incidentReportService.maskReporter(r)),
        };
    }

    @RequiresPermission(AdminPermission.INCIDENT_REPORT_READ)
    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        const report = await this.incidentReportService.findOne(id);
        return this.incidentReportService.maskReporter(report);
    }

    @RequiresPermission(AdminPermission.INCIDENT_REPORT_WRITE)
    @Patch(':id/status')
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateIncidentStatusDto,
        @CurrentAdmin() admin: Admin,
    ) {
        return this.incidentReportService.updateStatus(id, dto, admin);
    }
}
