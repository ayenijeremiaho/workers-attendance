import {Exclude, Expose, Type} from 'class-transformer';
import {ToDateString} from '../../utility/dto/date-converter';

class VenueDto {
    @Expose() id: string;
    @Expose() name: string;
    @Expose() address: string;
    @Expose() latitude: number;
    @Expose() longitude: number;
}

@Exclude()
export class EventConfigDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    description: string;

    @Expose()
    @Type(() => VenueDto)
    defaultVenue: VenueDto;

    @Expose()
    workerCheckinStartOffsetSeconds: number;

    @Expose()
    workerLateOffsetSeconds: number;

    @Expose()
    memberCheckinStartOffsetSeconds: number;

    @Expose()
    checkinStopOffsetSeconds: number;

    @Expose()
    allowedDistanceInMeters: number;

    @Expose()
    @ToDateString()
    createdAt: string;

    @Expose()
    @ToDateString()
    updatedAt: string;
}
