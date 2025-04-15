import { Exclude, Expose, Type } from 'class-transformer';
import { LeaveStatusEnum } from '../enums/leave-status.enum';
import { ToDateString } from '../../utility/dto/date-converter';
import { WorkerDto } from '../../user/dto/worker.dto';
import { AdminDto } from '../../user/dto/admin.dto';

@Exclude()
export class RequestLeaveDto {
  @Expose()
  id: string;

  @Expose()
  @Type(() => WorkerDto)
  worker: WorkerDto;

  @Expose()
  @Type(() => AdminDto)
  actionedBy: AdminDto;

  @Expose()
  @ToDateString()
  dateFrom: Date;

  @Expose()
  @ToDateString()
  dateTo: Date;

  @Expose()
  reason: string;

  @Expose()
  status: LeaveStatusEnum;

  @Expose()
  @ToDateString()
  createdAt: Date;

  @Expose()
  @ToDateString()
  updatedAt: Date;
}
