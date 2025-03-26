import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventConfig } from '../entity/event-config.entity';
import { Repository } from 'typeorm';
import { UpdateEventConfigDto } from '../dto/update-event-config.dto';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(EventConfig)
    private readonly globalEventConfigRepository: Repository<EventConfig>,
  ) {}

  async getGlobalEventConfig(): Promise<EventConfig> {
    const configs = await this.globalEventConfigRepository.find();
    return configs[0];
  }

  async updateGlobalEventConfig(
    updateEventConfigDto: UpdateEventConfigDto,
  ): Promise<void> {
    const configs = await this.globalEventConfigRepository.find();
    const globalEventConfig = configs[0];

    if (updateEventConfigDto.checkinStartTimeInSeconds !== undefined) {
      globalEventConfig.checkinStartTimeInSeconds =
        updateEventConfigDto.checkinStartTimeInSeconds;
    }
    if (updateEventConfigDto.lateComingStartTimeInSeconds !== undefined) {
      globalEventConfig.lateComingStartTimeInSeconds =
        updateEventConfigDto.lateComingStartTimeInSeconds;
    }
    if (updateEventConfigDto.defaultLocationLatitude !== undefined) {
      globalEventConfig.defaultLocationLatitude =
        updateEventConfigDto.defaultLocationLatitude;
    }
    if (updateEventConfigDto.defaultLocationLongitude !== undefined) {
      globalEventConfig.defaultLocationLongitude =
        updateEventConfigDto.defaultLocationLongitude;
    }

    await this.globalEventConfigRepository.save(globalEventConfig);
  }
}
