import { IsNotEmpty } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateWorkerDto extends CreateUserDto {
  @IsNotEmpty()
  departmentId: string;
}
