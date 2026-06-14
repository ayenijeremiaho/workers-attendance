import {ArrayMinSize, IsArray, IsEnum, IsUUID, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {FollowUpTaskStatusEnum} from '../enums/follow-up.enum';

class BulkTaskItem {
    @IsUUID()
    id: string;

    @IsEnum(FollowUpTaskStatusEnum)
    status: FollowUpTaskStatusEnum;
}

export class BulkUpdateTasksDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({each: true})
    @Type(() => BulkTaskItem)
    tasks: BulkTaskItem[];
}
