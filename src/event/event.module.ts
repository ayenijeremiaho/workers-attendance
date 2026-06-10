import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entity/event.entity';
import { EventConfig } from './entity/event-config.entity';
import { ServiceSlot } from './entity/service-slot.entity';
import { EventService } from './service/event.service';
import { EventConfigService } from './service/event-config.service';
import { EventController } from './controller/event.controller';
import { EventConfigController } from './controller/event-config.controller';
import { UtilityModule } from '../utility/utility.module';
import { VenueModule } from '../venue/venue.module';
import { DefaultEventConfigSeed } from './seed/default-event-config-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventConfig, ServiceSlot]),
    UtilityModule,
    VenueModule,
  ],
  controllers: [EventController, EventConfigController],
  providers: [EventService, EventConfigService, DefaultEventConfigSeed],
  exports: [TypeOrmModule, EventService, EventConfigService],
})
export class EventModule {}
