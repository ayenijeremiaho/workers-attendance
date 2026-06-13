import {Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {AuditLog} from '../entity/audit-log.entity';
import {Member} from '../../member/entity/member.entity';
import {PaginationResponseDto} from '../dto/pagination-response.dto';
import {UtilityService} from './utility.service';

export type AuditAction =
// Auth & identity
    | 'ADMIN_CREATED'
    | 'MEMBER_SIGNED_UP'
    | 'MEMBER_LOGIN'
    | 'MEMBER_LOGOUT'
    | 'ADMIN_LOGIN'
    | 'PASSWORD_CHANGED'
    | 'PASSWORD_RESET_REQUESTED'
    | 'PASSWORD_RESET_COMPLETED'
    | 'ADMIN_PASSWORD_RESET'
    // Member management
    | 'WORKER_PROMOTED'
    | 'WORKER_REVOKED'
    | 'MEMBER_ACTIVATED'
    | 'MEMBER_DEACTIVATED'
    | 'MEMBER_UPDATED'
    // Device management
    | 'DEVICE_PURGED'
    | 'DEVICE_RESET_REQUESTED'
    | 'DEVICE_RESET_COMPLETED'
    // Announcements
    | 'ANNOUNCEMENT_CREATED'
    | 'ANNOUNCEMENT_UPDATED'
    | 'ANNOUNCEMENT_DELETED'
    // Events
    | 'EVENT_CREATED'
    | 'EVENT_UPDATED'
    | 'EVENT_DELETED'
    // Notes
    | 'NOTE_CREATED'
    | 'NOTE_UPDATED'
    | 'NOTE_DELETED'
    // Leave requests
    | 'LEAVE_APPROVED'
    | 'LEAVE_REJECTED'
    // Departments
    | 'DEPARTMENT_CREATED'
    | 'DEPARTMENT_UPDATED'
    | 'DEPARTMENT_DELETED'
    | 'DEPARTMENT_LEAD_ASSIGNED'
    | 'DEPARTMENT_LEAD_REMOVED'
    // Worker profiles
    | 'WORKER_PROFILE_UPDATED'
    // Admin roles
    | 'ADMIN_ROLE_CREATED'
    | 'ADMIN_ROLE_UPDATED'
    | 'ADMIN_ROLE_DELETED'
    // Admin users
    | 'ADMIN_USER_CREATED'
    | 'ADMIN_USER_UPDATED'
    | 'ADMIN_USER_DEACTIVATED';

export interface AuditContext {
    actorId?: string;
    targetId?: string;
    targetEmail?: string;
    metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
    action?: AuditAction;
    actorId?: string;
    targetId?: string;
    dateFrom?: Date;
    dateTo?: Date;
}

@Injectable()
export class AuditLogService {
    private readonly logger = new Logger('AUDIT');

    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepository: Repository<AuditLog>,
    ) {
    }

    log(action: AuditAction, context: AuditContext = {}): void {
        this.logger.log({action, ...context});

        this.auditLogRepository.save({
            action,
            actor: context.actorId ? ({id: context.actorId} as Member) : null,
            targetId: context.targetId ?? null,
            targetEmail: context.targetEmail ?? null,
            metadata: context.metadata ?? null,
        }).catch((err) => this.logger.error(`Failed to persist audit log: ${action}`, err));
    }

    async findAll(
        page: number,
        limit: number,
        filters: AuditLogFilters = {},
    ): Promise<PaginationResponseDto<AuditLog>> {
        const qb = this.auditLogRepository
            .createQueryBuilder('log')
            .leftJoinAndSelect('log.actor', 'actor')
            .orderBy('log.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (filters.action) qb.andWhere('log.action = :action', {action: filters.action});
        if (filters.actorId) qb.andWhere('actor.id = :actorId', {actorId: filters.actorId});
        if (filters.targetId) qb.andWhere('log.targetId = :targetId', {targetId: filters.targetId});
        if (filters.dateFrom) qb.andWhere('log.createdAt >= :dateFrom', {dateFrom: filters.dateFrom});
        if (filters.dateTo) qb.andWhere('log.createdAt <= :dateTo', {dateTo: filters.dateTo});

        const [logs, total] = await qb.getManyAndCount();
        return UtilityService.createPaginationResponse(logs, page, limit, total);
    }
}
