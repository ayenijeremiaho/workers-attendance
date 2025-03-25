import { Module, OnModuleInit } from '@nestjs/common';
import { EventService } from './service/event.service';
import { EventController } from './controller/event.controller';
import { GlobalEventConfigSeed } from './seed/global-event-config.seed';
import { GlobalEventConfig } from './entity/global-event-config.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalEventConfig])],
  providers: [EventService, GlobalEventConfigSeed],
  controllers: [EventController],
})
export class EventModule implements OnModuleInit {
  constructor(private readonly globalEventConfigSeed: GlobalEventConfigSeed) {}

  async onModuleInit() {
    await this.globalEventConfigSeed.seed();
  }
}
