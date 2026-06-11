import { Module } from '@nestjs/common';
import { UtilityService } from './service/utility.service';
import { DateService } from './service/date.service';
import { CacheService } from './service/cache.service';
import { SanitizationService } from './service/sanitization.service';
import { EmailQueueService } from './service/email-queue.service';
import { ConfigModule } from '@nestjs/config';
import { UtilityController } from './controller/utility.controller';

@Module({
  imports: [ConfigModule],
  providers: [UtilityService, DateService, CacheService, SanitizationService, EmailQueueService],
  controllers: [UtilityController],
  exports: [UtilityService, DateService, CacheService, SanitizationService, EmailQueueService],
})
export class UtilityModule {}
