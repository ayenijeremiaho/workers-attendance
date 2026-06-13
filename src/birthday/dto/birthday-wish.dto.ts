import {IsNotEmpty, IsString, MaxLength} from 'class-validator';

export class SendWishDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    message: string;
}
