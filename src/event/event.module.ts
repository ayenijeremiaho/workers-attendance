import { Module, OnModuleInit } from '@nestjs/common';
import { EventService } from './service/event.service';
import { EventController } from './controller/event.controller';
import { GlobalEventConfigSeed } from './seed/global-event-config.seed';
import { EventConfig } from './entity/event-config.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([EventConfig]), ConfigModule],
  providers: [EventService, GlobalEventConfigSeed],
  controllers: [EventController],
})
export class EventModule implements OnModuleInit {
  constructor(private readonly globalEventConfigSeed: GlobalEventConfigSeed) {}

  async onModuleInit() {
    await this.globalEventConfigSeed.seed();
  }
}
