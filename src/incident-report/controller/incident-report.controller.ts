import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorator/current-user.decorator';
import { MemberAuth } from '../../auth/interface/auth.interface';
import { IncidentReportService } from '../service/incident-report.service';
import { CreateIncidentReportDto } from '../dto/incident-report.dto';
import { RequiresModule } from '../../church-settings/decorator/requires-module.decorator';
import { ModuleEnabledGuard } from '../../church-settings/guard/module-enabled.guard';

@RequiresModule('incident_report')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@Controller('incidents')
export class IncidentReportController {
  constructor(private readonly incidentReportService: IncidentReportService) {}

  @Post()
  create(
    @Body() dto: CreateIncidentReportDto,
    @CurrentUser() user: MemberAuth,
  ) {
    return this.incidentReportService.create(dto, user.id);
  }

  @Get()
  findAll(
    @CurrentUser() user: MemberAuth,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.incidentReportService.findMyReports(user.id, page, limit);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: MemberAuth,
  ) {
    return this.incidentReportService.findMyReport(id, user.id);
  }
}
