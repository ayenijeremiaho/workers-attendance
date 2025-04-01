import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateWorkerDto extends CreateUserDto {
  @IsNotEmpty()
  @IsUUID('4', { message: 'invalid departmentId' })
  departmentId: string;
}
