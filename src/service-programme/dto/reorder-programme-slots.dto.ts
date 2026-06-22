import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SlotOrderItem {
  @IsUUID()
  id: string;
}

export class ReorderProgrammeSlotsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SlotOrderItem)
  slots: SlotOrderItem[];
}
