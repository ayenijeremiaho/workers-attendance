import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Note } from '../entity/note.entity';
import { NoteTypeEnum } from '../enums/note-type.enums';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChildDedicationRequest,
  ChildNamingRequest,
  MarriageRequest,
  MemberAttendanceRequest,
} from '../dto/note-request.dto';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { EventService } from '../../event/service/event.service';
import { Event } from '../../event/entity/event.entity';
import {
  ChildDedicationDetails,
  ChildNamingDetails,
  MarriageDetails,
  MemberAttendanceDetails,
} from '../entity/note-details';
import {
  NoteDetails,
  NoteRequest,
  UpdateNoteRequest,
} from '../types/note-details.type';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/service/utility.service';
import {
  ChildDedicationDetailsDto,
  ChildNamingDetailsDto,
  MarriageDetailsDto,
  MemberAttendanceDetailsDto,
  NoteDto,
} from '../dto/note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    private readonly eventService: EventService,
  ) {}

  async create(request: NoteRequest): Promise<Note> {
    if (!request.type) {
      throw new BadRequestException('Note type is required for update');
    }
    await NotesService.validateNoteDetails(request.type, request);

    let event: Event | null = null;
    if (request.type === NoteTypeEnum.MEMBER_ATTENDANCE) {
      event = await this.getEvent(request.eventId);
    }

    return this.saveNote(request, event);
  }

  public async updateNote(
    id: string,
    request: UpdateNoteRequest,
  ): Promise<Note> {
    if (!request.type) {
      throw new BadRequestException('Note type is required for update');
    }

    const existingNote: any = await this.get(request.type, id);

    const noteType = existingNote.type;

    if (request.type !== noteType) {
      throw new BadRequestException('Changing note type is not allowed');
    }

    await NotesService.validateNoteDetails(noteType, request, true);

    let event: Event | null = null;
    if (request.type === NoteTypeEnum.MEMBER_ATTENDANCE) {
      if (
        request?.eventId &&
        request.eventId !== existingNote.details.event.id
      ) {
        event = await this.getEvent(request.eventId);
      }
    }

    existingNote.details = await this.mergeAndTransformNoteDetails(
      noteType,
      existingNote.details,
      request,
      event,
    );

    return this.noteRepository.save(existingNote);
  }

  public async get(type: NoteTypeEnum, id: string): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { type, id } });

    if (!note) {
      throw new NotFoundException(`Note does not exist`);
    }

    return note;
  }

  public async delete(type: NoteTypeEnum, id: string): Promise<void> {
    const note = await this.get(type, id);
    await this.noteRepository.remove(note);
  }

  public async getAll(
    type: NoteTypeEnum,
    page = 1,
    limit = 10,
    order: 'ASC' | 'DESC' = 'DESC',
    orderBy: keyof Note = 'createdAt',
  ): Promise<PaginationResponseDto<Note>> {
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    const [notes, total] = await this.noteRepository.findAndCount({
      where: { type },
      skip: (page - 1) * limit,
      take: limit,
      order: { [orderBy]: order },
    });

    return UtilityService.createPaginationResponse(notes, page, limit, total);
  }

  public static getNoteDto(note: Note): NoteDto {
    const noteDto = plainToInstance(NoteDto, note);
    if (!noteDto) {
      return null;
    }
    this.getNoteDetailsDto(noteDto, note);
    return noteDto;
  }

  public static getNoteDetailsDto(noteDto: NoteDto, note: Note) {
    switch (noteDto.type) {
      case NoteTypeEnum.CHILD_NAMING:
        noteDto.details = plainToInstance(ChildNamingDetailsDto, note.details);
        break;
      case NoteTypeEnum.CHILD_DEDICATION:
        noteDto.details = plainToInstance(
          ChildDedicationDetailsDto,
          note.details,
        );
        break;
      case NoteTypeEnum.MARRIAGE:
        noteDto.details = plainToInstance(MarriageDetailsDto, note.details);
        break;
      case NoteTypeEnum.MEMBER_ATTENDANCE:
        noteDto.details = plainToInstance(
          MemberAttendanceDetailsDto,
          note.details,
        );
        break;
      default:
        noteDto.details = null;
    }
  }

  private async getEvent(eventId: string): Promise<Event> {
    const event = await this.eventService.get(eventId, false);
    if (event.endDate > new Date()) {
      throw new Error('Event has not ended yet');
    }
    return event;
  }

  private async saveNote(request: any, event: Event | null): Promise<Note> {
    const note = new Note();
    note.type = request.type;

    switch (request.type) {
      case NoteTypeEnum.CHILD_NAMING:
        note.details = plainToInstance(ChildNamingDetails, request);
        note.details.dateOfBirth = new Date(request.dateOfBirth);
        break;
      case NoteTypeEnum.CHILD_DEDICATION:
        note.details = plainToInstance(ChildDedicationDetails, request);
        note.details.dedicationDate = new Date(request.dedicationDate);
        break;
      case NoteTypeEnum.MARRIAGE:
        note.details = plainToInstance(MarriageDetails, request);
        note.details.weddingDate = new Date(request.weddingDate);
        break;
      case NoteTypeEnum.MEMBER_ATTENDANCE:
        note.details = plainToInstance(MemberAttendanceDetails, request);
        note.details.event = event;
        break;
      default:
        throw new Error('Invalid note type');
    }

    return await this.noteRepository.save(note);
  }

  private async mergeAndTransformNoteDetails(
    type: NoteTypeEnum,
    existing: any,
    incoming: any,
    event: Event | null,
  ): Promise<NoteDetails> {
    switch (type) {
      case NoteTypeEnum.CHILD_NAMING:
        return {
          ...existing,
          ...incoming,
          dateOfBirth: incoming.dateOfBirth
            ? new Date(incoming.dateOfBirth)
            : existing.dateOfBirth,
        };

      case NoteTypeEnum.CHILD_DEDICATION:
        return {
          ...existing,
          ...incoming,
          dedicationDate: incoming.dedicationDate
            ? new Date(incoming.dedicationDate)
            : existing.dedicationDate,
        };

      case NoteTypeEnum.MARRIAGE:
        return {
          ...existing,
          ...incoming,
          weddingDate: incoming.weddingDate
            ? new Date(incoming.weddingDate)
            : existing.weddingDate,
        };

      case NoteTypeEnum.MEMBER_ATTENDANCE:
        return {
          ...existing,
          ...incoming,
          ...(event ? { event } : {}),
        };

      default:
        throw new Error('Unsupported note type');
    }
  }

  private static async validateNoteDetails(
    type: NoteTypeEnum,
    details: any,
    allowOptional = false,
  ): Promise<void> {
    let detailsClass: any;

    switch (type) {
      case NoteTypeEnum.CHILD_NAMING:
        detailsClass = ChildNamingRequest;
        break;
      case NoteTypeEnum.CHILD_DEDICATION:
        detailsClass = ChildDedicationRequest;
        break;
      case NoteTypeEnum.MARRIAGE:
        detailsClass = MarriageRequest;
        break;
      case NoteTypeEnum.MEMBER_ATTENDANCE:
        detailsClass = MemberAttendanceRequest;
        break;
      default:
        throw new Error('Invalid note type');
    }

    if (allowOptional) {
      const instance = plainToInstance(detailsClass, details, {
        exposeDefaultValues: true,
      });
      await validateOrReject(instance, { skipMissingProperties: true });
    } else {
      const instance = plainToInstance(detailsClass, details);
      await validateOrReject(instance);
    }
  }
}
