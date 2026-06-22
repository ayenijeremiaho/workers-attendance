import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  FollowUpOutcomeEnum,
  FollowUpTaskStatusEnum,
} from '../enums/follow-up.enum';

export class UpdateFollowUpTaskDto {
  @IsOptional()
  @IsEnum(FollowUpTaskStatusEnum)
  status?: FollowUpTaskStatusEnum;

  @IsOptional()
  @IsEnum(FollowUpOutcomeEnum)
  outcome?: FollowUpOutcomeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  outcomeNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  noteContent?: string;
}
