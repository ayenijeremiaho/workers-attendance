import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class BulkAssignDepartmentDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  memberIds: string[];
}
