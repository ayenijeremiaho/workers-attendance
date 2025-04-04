import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/service/utility.service';
import { EventConfigService } from '../service/event-config.service';
import { CreateEventConfigDto } from '../dto/create-event-config.dto';
import { EventConfigDto } from '../dto/event-config.dto';
import { UpdateEventConfigDto } from '../dto/update-event-config.dto';
import { EventConfig } from '../entity/event-config.entity';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserTypeEnum } from '../../user/enums/user-type.enum';

@UseGuards(RolesGuard)
@Roles(UserTypeEnum.ADMIN)
@Controller('event-config')
export class EventConfigController {
  constructor(private readonly eventConfigService: EventConfigService) {}

  @Post()
  async create(
    @Body() createEventConfigDto: CreateEventConfigDto,
  ): Promise<EventConfigDto> {
    const eventConfig =
      await this.eventConfigService.create(createEventConfigDto);
    return plainToInstance(EventConfigDto, eventConfig);
  }

  @Put('/:id')
  async update(
    @Param('id') id: string,
    @Body() updateEventConfigDto: UpdateEventConfigDto,
  ): Promise<EventConfigDto> {
    const eventConfig = await this.eventConfigService.update(
      id,
      updateEventConfigDto,
    );
    return plainToInstance(EventConfigDto, eventConfig);
  }

  @Get('/:id')
  async get(@Param('id') id: string): Promise<EventConfigDto> {
    const eventConfig = await this.eventConfigService.get(id);
    return plainToInstance(EventConfigDto, eventConfig);
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginationResponseDto<EventConfigDto>> {
    const eventConfigs = await this.eventConfigService.getAll(page, limit);
    return UtilityService.getPaginationResponseDto<EventConfig, EventConfigDto>(
      eventConfigs,
      EventConfigDto,
    );
  }

  @Delete('/:id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.eventConfigService.delete(id);
  }
}
