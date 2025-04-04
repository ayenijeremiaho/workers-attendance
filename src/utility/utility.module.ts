import { Module } from '@nestjs/common';
import { UtilityService } from './service/utility.service';
import { ConfigModule } from '@nestjs/config';
import { UtilityController } from './controller/utility.controller';

@Module({
  imports: [ConfigModule],
  providers: [UtilityService],
  controllers: [UtilityController],
  exports: [UtilityService],
})
export class UtilityModule {}
