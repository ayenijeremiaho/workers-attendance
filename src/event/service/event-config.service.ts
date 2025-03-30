import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventConfig } from '../entity/event-config.entity';
import { Repository } from 'typeorm';
import { UpdateEventConfigDto } from '../dto/update-event-config.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/utility.service';
import { CreateEventConfigDto } from '../dto/create-event-config.dto';
import { FindManyOptions } from 'typeorm/find-options/FindManyOptions';

@Injectable()
export class EventConfigService {
  constructor(
    @InjectRepository(EventConfig)
    private readonly eventConfigRepository: Repository<EventConfig>,
  ) {}

  async create(
    createEventConfigDto: CreateEventConfigDto,
  ): Promise<EventConfig> {
    if (
      createEventConfigDto.checkinStartTimeInSeconds <=
        createEventConfigDto.lateComingStartTimeInSeconds ||
      createEventConfigDto.checkinStopTimeInSeconds <=
        createEventConfigDto.lateComingStartTimeInSeconds
    ) {
      throw new BadRequestException(
        'checkinStartTimeInSeconds must be greater than lateComingStartTimeInSeconds and checkinStopTimeInSeconds must be greater than lateComingStartTimeInSeconds',
      );
    }

    const eventConfig = this.eventConfigRepository.create(createEventConfigDto);
    return this.eventConfigRepository.save(eventConfig);
  }

  async get(id: string | null): Promise<EventConfig> {
    const config = await this.eventConfigRepository.findOne({
      where: { event: id == null ? null : { id } },
    });

    if (!config) {
      throw new NotFoundException(`Event config not found`);
    }

    return config;
  }

  async getAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResponseDto<EventConfig>> {
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    const [eventConfigs, total] = await this.eventConfigRepository.findAndCount(
      {
        skip: (page - 1) * limit,
        take: limit,
        order: { createdAt: 'DESC' },
      },
    );

    return UtilityService.createPaginationResponse<EventConfig>(
      eventConfigs,
      page,
      limit,
      total,
    );
  }

  async update(
    id: string | null,
    updateEventConfigDto: UpdateEventConfigDto,
  ): Promise<EventConfig> {
    const config = await this.get(id);

    Object.keys(updateEventConfigDto).forEach((key) => {
      if (updateEventConfigDto[key] !== null) {
        config[key] = updateEventConfigDto[key];
      }
    });

    return this.eventConfigRepository.save(config);
  }

  async delete(id: string): Promise<void> {
    const eventConfig = await this.eventConfigRepository.findOne({
      where: { id },
      relations: ['event'],
    });

    if (!eventConfig) {
      throw new NotFoundException(`Event Config not found`);
    }

    if (eventConfig.event) {
      throw new BadRequestException(
        'Cannot delete Event Config attached to an event',
      );
    }

    await this.eventConfigRepository.remove(eventConfig);
  }

  async count(options?: FindManyOptions<EventConfig>): Promise<number> {
    return this.eventConfigRepository.count(options);
  }
}
