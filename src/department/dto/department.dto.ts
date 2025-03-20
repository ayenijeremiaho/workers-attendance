import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class DepartmentDto {
  @Expose()
  name: string;

  @Expose()
  description: string;
}
