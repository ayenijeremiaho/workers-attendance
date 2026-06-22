import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VirtualAccountProvider } from '../enum/finance.enum';

export class RequestVirtualAccountDto {
  @IsEnum(VirtualAccountProvider)
  provider: VirtualAccountProvider;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bvn?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nin?: string;
}
