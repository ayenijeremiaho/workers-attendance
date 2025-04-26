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
import { UtilityService } from '../../utility/service/utility.service';
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
    const alreadyExist = await this.existByName(createEventConfigDto.name);
    if (alreadyExist) {
      throw new BadRequestException(
        'Event config with the provided name already exist',
      );
    }

    if (
      createEventConfigDto.checkinStartTimeInSeconds <=
        createEventConfigDto.lateComingStartTimeInSeconds ||
      createEventConfigDto.lateComingStartTimeInSeconds <=
        createEventConfigDto.checkinStopTimeInSeconds
    ) {
      throw new BadRequestException(
        'lateComingStartTimeInSeconds must be greater than checkinStartTimeInSeconds and checkinStopTimeInSeconds must be greater than lateComingStartTimeInSeconds',
      );
    }

    const eventConfig = this.eventConfigRepository.create(createEventConfigDto);
    return this.eventConfigRepository.save(eventConfig);
  }

  async update(
    id: string | null,
    updateEventConfigDto: UpdateEventConfigDto,
  ): Promise<EventConfig> {
    const config = await this.get(id);

    if (
      updateEventConfigDto.name &&
      updateEventConfigDto.name !== config.name
    ) {
      const alreadyExist = await this.existByName(updateEventConfigDto.name);
      if (alreadyExist) {
        throw new BadRequestException(
          'Event config with the provided name already exist',
        );
      }
    }

    Object.keys(updateEventConfigDto).forEach((key) => {
      if (updateEventConfigDto[key] !== null) {
        config[key] = updateEventConfigDto[key];
      }
    });

    return this.eventConfigRepository.save(config);
  }

  async get(id: string | null): Promise<EventConfig> {
    const config = await this.eventConfigRepository.findOne({
      where: { id },
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

  async delete(id: string): Promise<void> {
    const eventConfig = await this.eventConfigRepository.findOne({
      where: { id },
      relations: ['event'],
    });

    if (!eventConfig) {
      throw new NotFoundException(`Event Config not found`);
    }

    if (eventConfig.events) {
      throw new BadRequestException(
        'Cannot delete Event Config attached to an event',
      );
    }

    await this.eventConfigRepository.remove(eventConfig);
  }

  async count(options?: FindManyOptions<EventConfig>): Promise<number> {
    return this.eventConfigRepository.count(options);
  }

  async existByName(name: string): Promise<boolean> {
    return !!(await this.eventConfigRepository.count({ where: { name } }));
  }
}
