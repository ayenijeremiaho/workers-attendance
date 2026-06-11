import { IsNotEmpty, IsString } from 'class-validator';

export class FlagCheckInDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
