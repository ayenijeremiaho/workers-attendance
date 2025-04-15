import { IsEnum, IsUUID } from 'class-validator';

export class AssignDepartmentHodDto {
  @IsUUID('4', { message: 'invalid departmentId' })
  departmentId: string;

  @IsUUID('4', { message: 'invalid workerId' })
  workerId: string;

  @IsEnum(['head', 'assistant'], {
    message: 'type must be either "head" or "assistant"',
  })
  type: 'head' | 'assistant';
}
