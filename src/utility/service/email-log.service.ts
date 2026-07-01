import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailLog, EmailLogStatus } from '../entity/email-log.entity';
import { PaginationResponseDto } from '../dto/pagination-response.dto';
import { UtilityService } from './utility.service';

export interface EmailLogFilters {
  recipient?: string;
  status?: EmailLogStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

@Injectable()
export class EmailLogService {
  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
  ) {}

  async findAll(
    page: number,
    limit: number,
    filters: EmailLogFilters = {},
  ): Promise<PaginationResponseDto<EmailLog>> {
    const qb = this.emailLogRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.recipient)
      qb.andWhere('log.recipient ILIKE :recipient', {
        recipient: `%${filters.recipient}%`,
      });
    if (filters.status)
      qb.andWhere('log.status = :status', { status: filters.status });
    if (filters.dateFrom)
      qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo)
      qb.andWhere('log.createdAt <= :dateTo', { dateTo: filters.dateTo });

    const [logs, total] = await qb.getManyAndCount();
    return UtilityService.createPaginationResponse(logs, page, limit, total);
  }
}
