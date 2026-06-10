import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventConfigService, UpdateEventConfigDto } from '../service/event-config.service';
import { CreateEventConfigDto } from '../dto/create-event-config.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';

@UseGuards(RolesGuard)
@Roles(MemberRoleEnum.ADMIN)
@Controller('event-config')
export class EventConfigController {
  constructor(private readonly eventConfigService: EventConfigService) {}

  @Post()
  async create(@Body() dto: CreateEventConfigDto) {
    return this.eventConfigService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventConfigDto,
  ) {
    return this.eventConfigService.update(id, dto);
  }

  @Get(':id')
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventConfigService.get(id);
  }

  @Get()
  async getAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.eventConfigService.getAll(+page, +limit);
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.eventConfigService.delete(id);
  }
}
