import { IsEnum, IsUUID } from 'class-validator';

export class RemoveDepartmentHodDto {
  @IsUUID('4', { message: 'invalid departmentId' })
  departmentId: string;

  @IsEnum(['head', 'assistant'], {
    message: 'type must be either "head" or "assistant"',
  })
  type: 'head' | 'assistant';
}
