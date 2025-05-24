import {
  ChildDedicationRequest,
  ChildNamingRequest,
  MarriageRequest,
  MemberAttendanceRequest,
} from '../dto/note-request.dto';
import {
  ChildDedicationDetails,
  ChildNamingDetails,
  MarriageDetails,
  MemberAttendanceDetails,
} from '../entity/note-details';
import {
  ChildDedicationDetailsDto,
  ChildNamingDetailsDto,
  MarriageDetailsDto,
  MemberAttendanceDetailsDto,
} from '../dto/note.dto';

export type NoteRequest =
  | ChildNamingRequest
  | ChildDedicationRequest
  | MarriageRequest
  | MemberAttendanceRequest;

export type NoteDetails =
  | ChildNamingDetails
  | ChildDedicationDetails
  | MarriageDetails
  | MemberAttendanceDetails;

export type NoteDetailsDto =
  | ChildNamingDetailsDto
  | ChildDedicationDetailsDto
  | MarriageDetailsDto
  | MemberAttendanceDetailsDto;

export type UpdateNoteRequest = Partial<NoteRequest>;
