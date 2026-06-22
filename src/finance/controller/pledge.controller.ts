import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../admin/guard/admin.guard';
import { RequiresPermission } from '../../admin/decorator/requires-permission.decorator';
import { AdminPermission } from '../../admin/enum/admin-permission.enum';
import { CurrentAdmin } from '../../admin/decorator/current-admin.decorator';
import { Admin } from '../../admin/entity/admin.entity';
import { PledgeService } from '../service/pledge.service';
import {
  CreatePledgeCampaignDto,
  CreatePledgeDto,
  PledgeQueryDto,
  UpdatePledgeStatusDto,
} from '../dto/pledge.dto';

@UseGuards(AdminGuard)
@Controller('admin/finance/pledges')
export class PledgeController {
  constructor(private readonly pledgeService: PledgeService) {}

  @RequiresPermission(AdminPermission.FINANCE_WRITE)
  @Post('campaigns')
  createCampaign(
    @Body() dto: CreatePledgeCampaignDto,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.pledgeService.createCampaign(dto, admin);
  }

  @RequiresPermission(AdminPermission.FINANCE_READ)
  @Get('campaigns')
  findAllCampaigns() {
    return this.pledgeService.findAllCampaigns();
  }

  @RequiresPermission(AdminPermission.FINANCE_READ)
  @Get('campaigns/:id')
  findOneCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.pledgeService.findOneCampaign(id);
  }

  @RequiresPermission(AdminPermission.FINANCE_WRITE)
  @Post()
  createPledge(@Body() dto: CreatePledgeDto, @CurrentAdmin() admin: Admin) {
    return this.pledgeService.createPledge(dto, admin);
  }

  @RequiresPermission(AdminPermission.FINANCE_READ)
  @Get()
  findPledges(@Query() query: PledgeQueryDto) {
    return this.pledgeService.findPledges(query);
  }

  @RequiresPermission(AdminPermission.FINANCE_WRITE)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePledgeStatusDto,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.pledgeService.updatePledgeStatus(id, dto, admin);
  }
}
