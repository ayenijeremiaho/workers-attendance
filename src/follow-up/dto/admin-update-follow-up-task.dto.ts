import { IsDateString, IsOptional } from 'class-validator';
import { UpdateFollowUpTaskDto } from './update-follow-up-task.dto';

export class AdminUpdateFollowUpTaskDto extends UpdateFollowUpTaskDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
