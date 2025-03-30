import { Transform } from 'class-transformer';
import { format } from 'date-fns';

export function ToDateString() {
  return Transform(({ value }) => format(value, 'yyyy-MM-dd'));
}
