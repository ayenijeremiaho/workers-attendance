import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventConfig } from '../entity/event-config.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GlobalEventConfigSeed {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EventConfig)
    private readonly globalEventConfigRepository: Repository<EventConfig>,
  ) {}

  async seed() {
    const count = await this.globalEventConfigRepository.count({
      where: { event: null },
    });
    if (count === 0) {
      const defaultConfig = this.globalEventConfigRepository.create({
        event: null,
        checkinStartTimeInSeconds: this.configService.get<number>(
          'DEFAULT_EVENT_CHECK_IN_TIME_IN_SECONDS',
        ),
        lateComingStartTimeInSeconds: this.configService.get<number>(
          'DEFAULT_EVENT_LATE_COMING_START_TIME_IN_SECONDS',
        ),
        defaultLocationLatitude: this.configService.get<number>(
          'DEFAULT_EVENT_LOCATION_LATITUDE',
        ),
        defaultLocationLongitude: this.configService.get<number>(
          'DEFAULT_EVENT_LOCATION_LONGITUDE',
        ),
      });
      await this.globalEventConfigRepository.save(defaultConfig);
    }
  }
}
