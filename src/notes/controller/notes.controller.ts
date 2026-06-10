import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotesService } from '../service/notes.service';
import { NoteTypeEnum } from '../enums/note-type.enums';
import { UtilityService } from '../../utility/service/utility.service';
import { NoteDto } from '../dto/note.dto';
import { NoteRequest, UpdateNoteRequest } from '../types/note-details.type';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { plainToInstance } from 'class-transformer';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(MemberRoleEnum.ADMIN)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('/:type')
  async findAll(
    @Param('type') type: NoteTypeEnum,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    const notes = await this.notesService.getAll(type, page, limit, order);
    return UtilityService.getPaginationResponseDto(notes, NoteDto);
  }

  @Post()
  async createNote(@Body() noteRequest: NoteRequest) {
    const note = await this.notesService.create(noteRequest);
    return plainToInstance(NoteDto, note, { excludeExtraneousValues: true });
  }

  @Put('/:id')
  async updateNote(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteRequest & { type: NoteTypeEnum },
  ) {
    const note = await this.notesService.update(id, updateNoteDto);
    return plainToInstance(NoteDto, note, { excludeExtraneousValues: true });
  }

  @Get('/:type/:id')
  async getNote(@Param('type') type: NoteTypeEnum, @Param('id') id: string) {
    const note = await this.notesService.get(type, id);
    return plainToInstance(NoteDto, note, { excludeExtraneousValues: true });
  }

  @Delete('/:type/:id')
  async deleteNote(@Param('type') type: NoteTypeEnum, @Param('id') id: string) {
    return this.notesService.delete(type, id);
  }
}
