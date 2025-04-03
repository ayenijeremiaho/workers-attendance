import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsUUID,
  Matches,
} from 'class-validator';

class CheckinLocationDto {
  @IsLongitude()
  longitude: number;

  @IsLatitude()
  latitude: number;
}

export class CheckInDto {
  @IsUUID('4', { message: 'invalid event' })
  eventId: string;

  @IsNotEmpty()
  location: CheckinLocationDto;

  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    message: 'checkInTime must be in the format YYYY-MM-DD HH:mm',
  })
  checkinTime: Date;
}
