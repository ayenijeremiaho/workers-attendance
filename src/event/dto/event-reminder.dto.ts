import {IsBoolean, IsEnum, IsOptional, IsUUID} from 'class-validator';
import {AnnouncementAudienceEnum} from '../../announcement/enum/announcement-audience.enum';
import {ReminderIntervalPresetEnum} from '../enum/reminder-interval-preset.enum';
import {PartialType} from '@nestjs/mapped-types';

export class CreateEventReminderDto {
    @IsEnum(ReminderIntervalPresetEnum)
    intervalPreset: ReminderIntervalPresetEnum;

    @IsEnum(AnnouncementAudienceEnum)
    @IsOptional()
    audience?: AnnouncementAudienceEnum;

    @IsUUID()
    @IsOptional()
    departmentId?: string;
}

export class UpdateEventReminderDto extends PartialType(CreateEventReminderDto) {
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;
}
