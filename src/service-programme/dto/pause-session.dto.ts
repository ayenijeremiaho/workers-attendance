import {IsEnum, IsNotEmpty} from 'class-validator';
import {ServicePauseReasonEnum} from '../enum/service-pause-reason.enum';

export class PauseSessionDto {
    @IsEnum(ServicePauseReasonEnum)
    @IsNotEmpty()
    reason: ServicePauseReasonEnum;
}
