import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
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
import { plainToInstance } from 'class-transformer';
import { AdminGuard } from '../../admin/guard/admin.guard';
import { RequiresPermission } from '../../admin/decorator/requires-permission.decorator';
import { AdminPermission } from '../../admin/enum/admin-permission.enum';
import { CurrentUser } from '../../auth/decorator/current-user.decorator';
import { MemberAuth } from '../../auth/interface/auth.interface';

@UseGuards(AdminGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @RequiresPermission(AdminPermission.NOTES_READ)
  @Get('/:type')
  async findAll(
    @Param(
      'type',
      new ParseEnumPipe(NoteTypeEnum, {
        exceptionFactory: () =>
          new BadRequestException(
            `Invalid note type. Must be one of: ${Object.values(NoteTypeEnum).join(', ')}`,
          ),
      }),
    )
    type: NoteTypeEnum,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    const notes = await this.notesService.getAll(type, page, limit, order);
    return UtilityService.getPaginationResponseDto(notes, NoteDto);
  }

  @RequiresPermission(AdminPermission.NOTES_WRITE)
  @Post()
  async createNote(
    @Body() noteRequest: NoteRequest,
    @CurrentUser() user: MemberAuth,
  ) {
    const note = await this.notesService.create(noteRequest, user.id);
    return plainToInstance(NoteDto, note, { excludeExtraneousValues: true });
  }

  @RequiresPermission(AdminPermission.NOTES_WRITE)
  @Put('/:id')
  async updateNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNoteDto: UpdateNoteRequest & { type: NoteTypeEnum },
    @CurrentUser() user: MemberAuth,
  ) {
    const note = await this.notesService.update(id, updateNoteDto, user.id);
    return plainToInstance(NoteDto, note, { excludeExtraneousValues: true });
  }

  @RequiresPermission(AdminPermission.NOTES_READ)
  @Get('/:type/:id')
  async getNote(
    @Param(
      'type',
      new ParseEnumPipe(NoteTypeEnum, {
        exceptionFactory: () =>
          new BadRequestException(
            `Invalid note type. Must be one of: ${Object.values(NoteTypeEnum).join(', ')}`,
          ),
      }),
    )
    type: NoteTypeEnum,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const note = await this.notesService.get(type, id);
    return plainToInstance(NoteDto, note, { excludeExtraneousValues: true });
  }

  @RequiresPermission(AdminPermission.NOTES_WRITE)
  @Delete('/:type/:id')
  async deleteNote(
    @Param(
      'type',
      new ParseEnumPipe(NoteTypeEnum, {
        exceptionFactory: () =>
          new BadRequestException(
            `Invalid note type. Must be one of: ${Object.values(NoteTypeEnum).join(', ')}`,
          ),
      }),
    )
    type: NoteTypeEnum,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: MemberAuth,
  ) {
    return this.notesService.delete(type, id, user.id);
  }
}
