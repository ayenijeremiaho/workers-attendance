import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RuntimeOverrideDto {
  @IsString()
  @IsOptional()
  overriddenTopic?: string;

  @IsString()
  @IsOptional()
  overriddenSpeakerName?: string;

  @IsUUID()
  @IsOptional()
  overriddenMemberId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  adjustedAllocatedMinutes?: number;
}
