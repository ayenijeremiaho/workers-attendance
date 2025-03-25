import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalEventConfig } from '../entity/global-event-config.entity';

@Injectable()
export class GlobalEventConfigSeed {
  constructor(
    @InjectRepository(GlobalEventConfig)
    private readonly globalEventConfigRepository: Repository<GlobalEventConfig>,
  ) {}

  async seed() {
    const count = await this.globalEventConfigRepository.count();
    if (count === 0) {
      const defaultConfig = this.globalEventConfigRepository.create({
        checkinStartTimeInSeconds: 3600,
        lateComingStartTimeInSeconds: 7200,
        defaultLocationLatitude: 0.0,
        defaultLocationLongitude: 0.0,
      });
      await this.globalEventConfigRepository.save(defaultConfig);
    }
  }
}
