import { Module } from '@nestjs/common';
import { NotesController } from './controller/notes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from './entity/note.entity';
import { EventModule } from '../event/event.module';
import { NotesService } from './service/notes.service';
import { NotesAnalyticsService } from './service/notes-analytics.service';
import { NotesAnalyticsController } from './controller/notes-analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Note]), EventModule],
  providers: [NotesService, NotesAnalyticsService],
  controllers: [NotesController, NotesAnalyticsController],
  exports: [TypeOrmModule, NotesService],
})
export class NotesModule {}
