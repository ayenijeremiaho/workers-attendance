import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventConfigService } from '../service/event-config.service';

@Injectable()
export class DefaultEventConfigSeed {
  private readonly logger = new Logger(DefaultEventConfigSeed.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly eventConfigService: EventConfigService,
  ) {}

  async seed() {
    const count = await this.eventConfigService.count({});
    if (count === 0) {
      await this.eventConfigService.create({
        name: this.configService.get<string>('DEFAULT_EVENT_CONFIG_NAME'),
        checkinStartTimeInSeconds: this.configService.get<number>(
          'DEFAULT_EVENT_START_CHECK_IN_TIME_IN_SECONDS',
        ),
        lateComingStartTimeInSeconds: this.configService.get<number>(
          'DEFAULT_EVENT_LATE_COMING_START_TIME_IN_SECONDS',
        ),
        checkinStopTimeInSeconds: this.configService.get<number>(
          'DEFAULT_EVENT_STOP_CHECK_IN_TIME_IN_SECONDS',
        ),
        locationLongitude: this.configService.get<number>(
          'DEFAULT_EVENT_LOCATION_LATITUDE',
        ),
        locationLatitude: this.configService.get<number>(
          'DEFAULT_EVENT_LOCATION_LONGITUDE',
        ),
      });
      this.logger.log('Default event config seeded');
    } else {
      this.logger.log('Default event config already exist');
    }
  }
}
