import {IsLatitude, IsLongitude, IsOptional, IsUUID, ValidateNested,} from 'class-validator';
import {Type} from 'class-transformer';

class CheckinLocationDto {
    @IsLongitude()
    longitude: number;

    @IsLatitude()
    latitude: number;
}

export class CheckInDto {
    @IsUUID('4', {message: 'Invalid serviceSlotId'})
    serviceSlotId: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => CheckinLocationDto)
    location?: CheckinLocationDto;
}
