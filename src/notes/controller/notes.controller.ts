import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { NotesService } from '../service/notes.service';
import { NoteTypeEnum } from '../enums/note-type.enums';
import { UtilityService } from '../../utility/service/utility.service';
import { NoteDto } from '../dto/note.dto';
import { NoteRequest, UpdateNoteRequest } from '../types/note-details.type';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserTypeEnum } from '../../user/enums/user-type.enum';

@Controller('notes')
@Roles(UserTypeEnum.ADMIN)
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
    return NotesService.getNoteDto(note);
  }

  @Put('/:id')
  async updateNote(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteRequest,
  ) {
    const note = await this.notesService.updateNote(id, updateNoteDto);
    return NotesService.getNoteDto(note);
  }

  @Get('/:type/:id')
  async getNote(@Param('type') type: NoteTypeEnum, @Param('id') id: string) {
    const note = await this.notesService.get(type, id);
    return NotesService.getNoteDto(note);
  }

  @Delete('/:type/:id')
  async deleteNote(@Param('type') type: NoteTypeEnum, @Param('id') id: string) {
    return this.notesService.delete(type, id);
  }
}
