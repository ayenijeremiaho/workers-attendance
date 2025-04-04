import { Module, OnModuleInit } from '@nestjs/common';
import { EventService } from './service/event.service';
import { EventController } from './controller/event.controller';
import { DefaultEventConfigSeed } from './seed/default-event-config-seed.service';
import { EventConfig } from './entity/event-config.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventConfigService } from './service/event-config.service';
import { Event } from './entity/event.entity';
import { EventConfigController } from './controller/event-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EventConfig, Event]), ConfigModule],
  providers: [EventService, EventConfigService, DefaultEventConfigSeed],
  controllers: [EventController, EventConfigController],
  exports: [TypeOrmModule, EventService],
})
export class EventModule implements OnModuleInit {
  constructor(private readonly globalEventConfigSeed: DefaultEventConfigSeed) {}

  async onModuleInit() {
    await this.globalEventConfigSeed.seed();
  }
}
