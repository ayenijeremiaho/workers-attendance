import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from './entity/announcement.entity';
import { AnnouncementService } from './service/announcement.service';
import { AnnouncementController } from './controller/announcement.controller';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Announcement]),
    MemberModule,
  ],
  providers: [AnnouncementService],
  controllers: [AnnouncementController],
  exports: [TypeOrmModule, AnnouncementService],
})
export class AnnouncementModule {}
