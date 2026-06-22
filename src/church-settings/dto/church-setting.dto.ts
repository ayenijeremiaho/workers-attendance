import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateChurchSettingDto {
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;
}

export class ChurchSettingResponseDto {
  key: string;
  moduleName: string;
  enabled: boolean;
  required: boolean;
}
