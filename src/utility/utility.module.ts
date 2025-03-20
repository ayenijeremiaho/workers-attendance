import { Module } from '@nestjs/common';
import { UtilityService } from './utility.service';
import { ConfigModule } from '@nestjs/config';
import { UtilityController } from './utility.controller';

@Module({
  imports: [ConfigModule],
  providers: [UtilityService],
  controllers: [UtilityController],
})
export class UtilityModule {}
