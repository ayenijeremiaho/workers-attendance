import {
  ChildDedicationRequest,
  ChildNamingRequest,
  MarriageRequest,
} from '../dto/note-request.dto';
import {
  ChildDedicationDetails,
  ChildNamingDetails,
  MarriageDetails,
} from '../entity/note-details';

export type NoteRequest = ChildNamingRequest | ChildDedicationRequest | MarriageRequest;

export type NoteDetails = ChildNamingDetails | ChildDedicationDetails | MarriageDetails;

export type UpdateNoteRequest = Partial<NoteRequest>;
