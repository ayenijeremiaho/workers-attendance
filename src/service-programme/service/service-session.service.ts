import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {ServiceSession} from '../entity/service-session.entity';
import {ServiceSessionSlot} from '../entity/service-session-slot.entity';
import {ServicePauseEntry} from '../entity/service-pause-entry.entity';
import {ServiceActionEntry} from '../entity/service-action-entry.entity';
import {WorkerProfile} from '../../member/entity/worker-profile.entity';
import {Member} from '../../member/entity/member.entity';
import {ServiceProgrammeService} from './service-programme.service';
import {PauseSessionDto} from '../dto/pause-session.dto';
import {RuntimeOverrideDto} from '../dto/runtime-override.dto';
import {ServiceSessionStatusEnum} from '../enum/service-session-status.enum';
import {ServiceSessionSlotStatusEnum} from '../enum/service-session-slot-status.enum';
import {ServiceActionRoleEnum} from '../enum/service-action-role.enum';
import {ServiceProgrammeStatusEnum} from '../enum/service-programme-status.enum';
import {DepartmentKeyEnum} from '../../department/enums/department-key.enum';
import {WorkerStatusEnum} from '../../member/enums/worker-status.enum';
import {CacheService} from '../../utility/service/cache.service';
import {EmailQueueService} from '../../utility/service/email-queue.service';
import {PdfService} from '../../utility/service/pdf.service';
import {PaginationResponseDto} from '../../utility/dto/pagination-response.dto';

export interface SessionAnchor {
    currentSlotPosition: number;
    slotStartedAt: number;
    slotBaseSeconds: number;
    status: ServiceSessionStatusEnum;
    isPaused: boolean;
    pausedAt: number | null;
}

export interface SessionSlotReport {
    position: number;
    type: string;
    topic: string | null;
    speakerName: string | null;
    speakerId: string | null;
    allocatedMinutes: number;
    actualSeconds: number | null;
    overrunSeconds: number | null;
    status: string;
}

export interface SessionReport {
    sessionCode: string;
    programme: {id: string; serviceSlotName: string | null};
    status: string;
    startedAt: Date;
    endedAt: Date | null;
    totalDurationMinutes: number | null;
    totalPauseDurationSeconds: number;
    completedSlots: number;
    totalSlots: number;
    completionRate: number;
    totalAllocatedMinutes: number;
    slotVarianceMinutes: number;
    slots: SessionSlotReport[];
    pauseCount: number;
    pauses: Array<{
        slotPosition: number;
        reason: string;
        pausedAt: Date;
        resumedAt: Date | null;
        durationSeconds: number | null;
    }>;
}

export interface SlotTypeStats {
    type: string;
    totalSlots: number;
    completedSlots: number;
    avgActualSeconds: number | null;
    avgAllocatedMinutes: number;
    avgOverrunSeconds: number | null;
    overrunCount: number;
}

export interface TopSpeaker {
    memberId: string;
    name: string;
    slotCount: number;
    totalActualSeconds: number;
    avgActualSeconds: number;
}

export interface FullEventSessionEntry {
    serviceSlotName: string;
    slotStartTime: Date;
    slotEndTime: Date;
    report: SessionReport;
}

export interface FullEventReport {
    eventName: string;
    eventDate: string;
    sessions: FullEventSessionEntry[];
    summary: {
        sessionCount: number;
        totalAllocatedMinutes: number;
        totalSlotVarianceMinutes: number;
        totalDurationMinutes: number | null;
        totalPauseMinutes: number;
        avgCompletionRate: number;
    };
}

export interface AnalyticsResult {
    from: string | null;
    to: string | null;
    totalSessions: number;
    slotTypeStats: SlotTypeStats[];
    sessions: Array<{
        sessionCode: string;
        startedAt: Date;
        totalDurationMinutes: number | null;
        completionRate: number;
        overrunSlots: number;
        totalPauseDurationSeconds: number;
    }>;
    topSpeakers: TopSpeaker[];
}

const SESSION_TTL_LIVE = 86400 * 2;
const SESSION_TTL_COMPLETED = 86400 * 2;
const ANALYTICS_TTL = 1800;

@Injectable()
export class ServiceSessionService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly cacheService: CacheService,
        private readonly programmeSvc: ServiceProgrammeService,
        private readonly emailQueueService: EmailQueueService,
        private readonly pdfService: PdfService,
        @InjectRepository(ServiceSession)
        private readonly sessionRepo: Repository<ServiceSession>,
        @InjectRepository(ServiceSessionSlot)
        private readonly sessionSlotRepo: Repository<ServiceSessionSlot>,
        @InjectRepository(ServicePauseEntry)
        private readonly pauseEntryRepo: Repository<ServicePauseEntry>,
        @InjectRepository(ServiceActionEntry)
        private readonly actionEntryRepo: Repository<ServiceActionEntry>,
        @InjectRepository(WorkerProfile)
        private readonly workerProfileRepo: Repository<WorkerProfile>,
        @InjectRepository(Member)
        private readonly memberRepo: Repository<Member>,
    ) {}

    private readonly logger = new Logger(ServiceSessionService.name);

    async start(programmeId: string, memberId: string): Promise<ServiceSession> {
        await this.assertAdminDeptWorker(memberId);

        const programme = await this.programmeSvc.assertProgrammeIsDraft(programmeId);
        if (!programme.slots || programme.slots.length === 0) {
            throw new BadRequestException('Programme has no slots');
        }

        const sessionCode = this.generateSessionCode();
        const now = new Date();

        const session = await this.dataSource.transaction(async (manager) => {
            const newSession = manager.create(ServiceSession, {
                programme,
                sessionCode,
                status: ServiceSessionStatusEnum.LIVE,
                startedAt: now,
                endedAt: null,
            });
            const saved = await manager.save(ServiceSession, newSession);

            const sortedSlots = [...programme.slots].sort((a, b) => a.position - b.position);
            const sessionSlots = sortedSlots.map((s, index) =>
                manager.create(ServiceSessionSlot, {
                    session: saved,
                    programmeSlot: s,
                    position: index,
                    status: index === 0
                        ? ServiceSessionSlotStatusEnum.IN_PROGRESS
                        : ServiceSessionSlotStatusEnum.PENDING,
                    startedAt: index === 0 ? now : null,
                }),
            );
            await manager.save(ServiceSessionSlot, sessionSlots);
            return saved;
        });

        await this.programmeSvc.setProgrammeStatus(programmeId, ServiceProgrammeStatusEnum.LIVE);

        const anchor: SessionAnchor = {
            currentSlotPosition: 0,
            slotStartedAt: now.getTime(),
            slotBaseSeconds: 0,
            status: ServiceSessionStatusEnum.LIVE,
            isPaused: false,
            pausedAt: null,
        };
        await this.cacheService.set(this.anchorKey(sessionCode), anchor, SESSION_TTL_LIVE);

        await this.logAction(session.id, ServiceActionRoleEnum.WORKER, 'SESSION_STARTED', null, memberId);

        return session;
    }

    async advance(sessionCode: string, memberId: string): Promise<SessionAnchor> {
        await this.assertAdminDeptWorker(memberId);

        const anchor = await this.getAnchorOrThrow(sessionCode);
        const session = await this.getSessionOrThrow(sessionCode);
        const totalSlots = await this.sessionSlotRepo.count({where: {session: {id: session.id}}});

        const now = Date.now();
        const currentActualSeconds = this.calcElapsed(anchor, now);

        await this.sessionSlotRepo.update(
            {session: {id: session.id}, position: anchor.currentSlotPosition},
            {
                status: ServiceSessionSlotStatusEnum.COMPLETED,
                actualSeconds: Math.round(currentActualSeconds),
                completedAt: new Date(now),
            },
        );

        const nextPosition = anchor.currentSlotPosition + 1;
        if (nextPosition >= totalSlots) {
            throw new BadRequestException('No next slot — call end session instead');
        }

        await this.sessionSlotRepo.update(
            {session: {id: session.id}, position: nextPosition},
            {status: ServiceSessionSlotStatusEnum.IN_PROGRESS, startedAt: new Date(now)},
        );

        if (anchor.isPaused && anchor.pausedAt) {
            await this.pauseEntryRepo
                .createQueryBuilder()
                .update()
                .set({resumedAt: new Date(now)})
                .where('session_id = :sid AND resumed_at IS NULL', {sid: session.id})
                .execute();
        }

        const newAnchor: SessionAnchor = {
            currentSlotPosition: nextPosition,
            slotStartedAt: now,
            slotBaseSeconds: 0,
            status: ServiceSessionStatusEnum.LIVE,
            isPaused: false,
            pausedAt: null,
        };
        await this.cacheService.set(this.anchorKey(sessionCode), newAnchor, SESSION_TTL_LIVE);
        await this.logAction(session.id, ServiceActionRoleEnum.WORKER, 'ADVANCE_SLOT', `position:${nextPosition}`, memberId);

        return newAnchor;
    }

    async rewind(sessionCode: string, memberId: string): Promise<SessionAnchor> {
        await this.assertAdminDeptWorker(memberId);

        const anchor = await this.getAnchorOrThrow(sessionCode);
        const session = await this.getSessionOrThrow(sessionCode);

        if (anchor.currentSlotPosition === 0) {
            throw new BadRequestException('Already at the first slot');
        }

        const now = Date.now();

        await this.sessionSlotRepo.update(
            {session: {id: session.id}, position: anchor.currentSlotPosition},
            {status: ServiceSessionSlotStatusEnum.PENDING, startedAt: null, completedAt: null, actualSeconds: null},
        );

        const prevPosition = anchor.currentSlotPosition - 1;
        await this.sessionSlotRepo.update(
            {session: {id: session.id}, position: prevPosition},
            {status: ServiceSessionSlotStatusEnum.IN_PROGRESS, startedAt: new Date(now), completedAt: null, actualSeconds: null},
        );

        const newAnchor: SessionAnchor = {
            currentSlotPosition: prevPosition,
            slotStartedAt: now,
            slotBaseSeconds: 0,
            status: ServiceSessionStatusEnum.LIVE,
            isPaused: false,
            pausedAt: null,
        };
        await this.cacheService.set(this.anchorKey(sessionCode), newAnchor, SESSION_TTL_LIVE);
        await this.logAction(session.id, ServiceActionRoleEnum.WORKER, 'REWIND_SLOT', `position:${prevPosition}`, memberId);

        return newAnchor;
    }

    async pause(sessionCode: string, dto: PauseSessionDto, memberId: string): Promise<SessionAnchor> {
        await this.assertAdminDeptWorker(memberId);

        const anchor = await this.getAnchorOrThrow(sessionCode);
        if (anchor.isPaused) throw new BadRequestException('Session is already paused');

        const session = await this.getSessionOrThrow(sessionCode);
        const now = Date.now();

        await this.pauseEntryRepo.save(
            this.pauseEntryRepo.create({
                session,
                slotPosition: anchor.currentSlotPosition,
                reason: dto.reason,
                pausedAt: new Date(now),
                resumedAt: null,
            }),
        );

        const newAnchor: SessionAnchor = {
            ...anchor,
            isPaused: true,
            pausedAt: now,
        };
        await this.cacheService.set(this.anchorKey(sessionCode), newAnchor, SESSION_TTL_LIVE);
        await this.logAction(session.id, ServiceActionRoleEnum.WORKER, 'PAUSE', dto.reason, memberId);

        return newAnchor;
    }

    async resume(sessionCode: string, memberId: string): Promise<SessionAnchor> {
        await this.assertAdminDeptWorker(memberId);

        const anchor = await this.getAnchorOrThrow(sessionCode);
        if (!anchor.isPaused || !anchor.pausedAt) throw new BadRequestException('Session is not paused');

        const session = await this.getSessionOrThrow(sessionCode);
        const now = Date.now();

        await this.pauseEntryRepo
            .createQueryBuilder()
            .update()
            .set({resumedAt: new Date(now)})
            .where('session_id = :sid AND resumed_at IS NULL', {sid: session.id})
            .execute();

        const elapsedBeforePause = anchor.slotBaseSeconds + (anchor.pausedAt - anchor.slotStartedAt) / 1000;
        const newAnchor: SessionAnchor = {
            currentSlotPosition: anchor.currentSlotPosition,
            slotStartedAt: now,
            slotBaseSeconds: elapsedBeforePause,
            status: ServiceSessionStatusEnum.LIVE,
            isPaused: false,
            pausedAt: null,
        };
        await this.cacheService.set(this.anchorKey(sessionCode), newAnchor, SESSION_TTL_LIVE);
        await this.logAction(session.id, ServiceActionRoleEnum.WORKER, 'RESUME', null, memberId);

        return newAnchor;
    }

    async overrideSlot(sessionCode: string, position: number, dto: RuntimeOverrideDto, memberId: string): Promise<ServiceSessionSlot> {
        await this.assertAdminDeptWorker(memberId);

        const session = await this.getSessionOrThrow(sessionCode);
        const sessionSlot = await this.sessionSlotRepo.findOne({
            where: {session: {id: session.id}, position},
            relations: ['overriddenMember'],
        });
        if (!sessionSlot) throw new NotFoundException(`No slot at position ${position}`);

        if (dto.overriddenSpeakerName !== undefined) sessionSlot.overriddenSpeakerName = dto.overriddenSpeakerName;
        if (dto.overriddenTopic !== undefined) sessionSlot.overriddenTopic = dto.overriddenTopic;
        if (dto.adjustedAllocatedMinutes !== undefined) sessionSlot.adjustedAllocatedMinutes = dto.adjustedAllocatedMinutes;
        if (dto.overriddenMemberId !== undefined) {
            sessionSlot.overriddenMember = dto.overriddenMemberId
                ? await this.memberRepo.findOne({where: {id: dto.overriddenMemberId}})
                : null;
        }

        const saved = await this.sessionSlotRepo.save(sessionSlot);
        await this.logAction(session.id, ServiceActionRoleEnum.WORKER, 'SLOT_OVERRIDE', `position:${position}`, memberId);

        return saved;
    }

    async end(sessionCode: string, memberId: string): Promise<ServiceSession> {
        await this.assertAdminDeptWorker(memberId);

        const anchor = await this.getAnchorOrThrow(sessionCode);
        const session = await this.getSessionOrThrow(sessionCode, ['programme', 'programme.slots', 'programme.serviceSlot']);

        const now = Date.now();
        const currentActualSeconds = this.calcElapsed(anchor, now);

        await this.dataSource.transaction(async (manager) => {
            await manager.update(
                ServiceSessionSlot,
                {session: {id: session.id}, position: anchor.currentSlotPosition},
                {
                    status: ServiceSessionSlotStatusEnum.COMPLETED,
                    actualSeconds: Math.round(currentActualSeconds),
                    completedAt: new Date(now),
                },
            );
            await manager.update(
                ServiceSessionSlot,
                {session: {id: session.id}, status: ServiceSessionSlotStatusEnum.PENDING},
                {status: ServiceSessionSlotStatusEnum.SKIPPED},
            );
            await manager.update(ServiceSession, {id: session.id}, {
                status: ServiceSessionStatusEnum.COMPLETED,
                endedAt: new Date(now),
            });
        });

        await this.programmeSvc.setProgrammeStatus(session.programme.id, ServiceProgrammeStatusEnum.COMPLETED);

        if (session.programme.saveAsTemplate) {
            await this.programmeSvc.upsertTemplateFromProgramme(session.programme);
        }

        const completedAnchor: SessionAnchor = {...anchor, status: ServiceSessionStatusEnum.COMPLETED};
        await this.cacheService.set(this.anchorKey(sessionCode), completedAnchor, SESSION_TTL_COMPLETED);

        await this.logAction(session.id, ServiceActionRoleEnum.WORKER, 'SESSION_ENDED', null, memberId);

        this.dispatchSessionReportEmail(sessionCode, session.programme.serviceSlot?.name ?? 'Service Session');
        this.cacheService.flushNamespace('session:analytics');

        return this.sessionRepo.findOne({where: {id: session.id}});
    }

    async getState(sessionCode: string): Promise<{anchor: SessionAnchor; session: ServiceSession}> {
        const session = await this.getSessionOrThrow(sessionCode, [
            'programme',
            'programme.slots',
            'programme.slots.member',
            'programme.slots.backupMember',
            'sessionSlots',
        ]);

        let anchor = await this.cacheService.get<SessionAnchor>(this.anchorKey(sessionCode));
        if (!anchor) {
            anchor = await this.reconstructAnchorFromDb(session);
        }

        return {anchor, session};
    }

    async getSlotForSpeaker(sessionCode: string, position: number): Promise<{slot: ServiceSessionSlot; anchor: SessionAnchor}> {
        const session = await this.getSessionOrThrow(sessionCode, [
            'sessionSlots',
            'sessionSlots.programmeSlot',
            'sessionSlots.programmeSlot.member',
            'sessionSlots.overriddenMember',
        ]);
        const slot = session.sessionSlots?.find((s) => s.position === position);
        if (!slot) throw new NotFoundException(`No slot at position ${position}`);

        let anchor = await this.cacheService.get<SessionAnchor>(this.anchorKey(sessionCode));
        if (!anchor) {
            anchor = await this.reconstructAnchorFromDb(session);
        }
        return {slot, anchor};
    }

    async getSessionHistory(programmeId: string, page = 1, limit = 20): Promise<PaginationResponseDto<ServiceSession>> {
        if (page < 1) throw new BadRequestException('Page must be greater than 0');

        const [data, total] = await this.sessionRepo.findAndCount({
            where: {programme: {id: programmeId}},
            relations: ['sessionSlots'],
            order: {startedAt: 'DESC'},
            skip: (page - 1) * limit,
            take: limit,
        });
        return {data, page, limit, totalCount: total, totalPages: Math.ceil(total / limit)};
    }

    async getFormattedReport(sessionCode: string): Promise<SessionReport> {
        const session = await this.sessionRepo.findOne({
            where: {sessionCode},
            relations: [
                'programme',
                'programme.serviceSlot',
                'sessionSlots',
                'sessionSlots.programmeSlot',
                'sessionSlots.programmeSlot.member',
                'sessionSlots.overriddenMember',
                'pauseEntries',
            ],
            order: {sessionSlots: {position: 'ASC'}, pauseEntries: {pausedAt: 'ASC'}},
        });
        if (!session) throw new NotFoundException('Session not found');
        return this.buildSessionReport(session);
    }

    async getReportPdf(sessionCode: string): Promise<Buffer> {
        const report = await this.getFormattedReport(sessionCode);
        return this.pdfService.generateSessionReport(report);
    }

    async getFullEventReportPdf(eventId: string): Promise<Buffer> {
        const sessions = await this.sessionRepo
            .createQueryBuilder('session')
            .innerJoinAndSelect('session.programme', 'programme')
            .innerJoinAndSelect('programme.serviceSlot', 'serviceSlot')
            .innerJoinAndSelect('serviceSlot.event', 'event')
            .leftJoinAndSelect('session.sessionSlots', 'sessionSlots')
            .leftJoinAndSelect('sessionSlots.programmeSlot', 'programmeSlot')
            .leftJoinAndSelect('programmeSlot.member', 'member')
            .leftJoinAndSelect('sessionSlots.overriddenMember', 'overriddenMember')
            .leftJoinAndSelect('session.pauseEntries', 'pauseEntries')
            .where('event.id = :eventId', {eventId})
            .orderBy('serviceSlot.startTime', 'ASC')
            .addOrderBy('sessionSlots.position', 'ASC')
            .addOrderBy('pauseEntries.pausedAt', 'ASC')
            .getMany();

        if (sessions.length === 0) throw new NotFoundException('No sessions found for this event');

        const incomplete = sessions.filter((s) => s.status !== ServiceSessionStatusEnum.COMPLETED);
        if (incomplete.length > 0) {
            throw new BadRequestException(`${incomplete.length} session(s) are not yet completed`);
        }

        const event = sessions[0].programme.serviceSlot.event;
        const eventDate = event.eventDate instanceof Date
            ? event.eventDate.toISOString().slice(0, 10)
            : String(event.eventDate);

        const sessionReports = sessions.map((s) => this.buildSessionReport(s));
        const totalAllocatedMinutes = sessionReports.reduce((sum, r) => sum + r.totalAllocatedMinutes, 0);
        const totalSlotVarianceMinutes = sessionReports.reduce((sum, r) => sum + r.slotVarianceMinutes, 0);
        const totalDurationMinutes = sessionReports.every((r) => r.totalDurationMinutes != null)
            ? sessionReports.reduce((sum, r) => sum + (r.totalDurationMinutes ?? 0), 0)
            : null;
        const totalPauseMinutes = Math.round(
            sessionReports.reduce((sum, r) => sum + r.totalPauseDurationSeconds, 0) / 60,
        );
        const avgCompletionRate = Math.round(
            sessionReports.reduce((sum, r) => sum + r.completionRate, 0) / sessionReports.length,
        );

        const fullReport: FullEventReport = {
            eventName: event.name,
            eventDate,
            sessions: sessions.map((session, i) => ({
                serviceSlotName: session.programme.serviceSlot.name,
                slotStartTime: session.programme.serviceSlot.startTime,
                slotEndTime: session.programme.serviceSlot.endTime,
                report: sessionReports[i],
            })),
            summary: {
                sessionCount: sessions.length,
                totalAllocatedMinutes,
                totalSlotVarianceMinutes,
                totalDurationMinutes,
                totalPauseMinutes,
                avgCompletionRate,
            },
        };

        return this.pdfService.generateFullEventReport(fullReport);
    }

    async getEventSummaryReportPdf(eventId: string): Promise<Buffer> {
        const sessions = await this.sessionRepo
            .createQueryBuilder('session')
            .innerJoinAndSelect('session.programme', 'programme')
            .innerJoinAndSelect('programme.serviceSlot', 'serviceSlot')
            .innerJoinAndSelect('serviceSlot.event', 'event')
            .leftJoinAndSelect('session.sessionSlots', 'sessionSlots')
            .leftJoinAndSelect('sessionSlots.programmeSlot', 'programmeSlot')
            .leftJoinAndSelect('programmeSlot.member', 'member')
            .leftJoinAndSelect('sessionSlots.overriddenMember', 'overriddenMember')
            .leftJoinAndSelect('session.pauseEntries', 'pauseEntries')
            .where('event.id = :eventId', {eventId})
            .orderBy('serviceSlot.startTime', 'ASC')
            .addOrderBy('sessionSlots.position', 'ASC')
            .addOrderBy('pauseEntries.pausedAt', 'ASC')
            .getMany();

        if (sessions.length === 0) throw new NotFoundException('No sessions found for this event');

        const event = sessions[0].programme.serviceSlot.event;
        const eventDate = event.eventDate instanceof Date
            ? event.eventDate.toISOString().slice(0, 10)
            : String(event.eventDate);

        const sessionReports = sessions.map((s) => this.buildSessionReport(s));
        const totalAllocatedMinutes = sessionReports.reduce((sum, r) => sum + r.totalAllocatedMinutes, 0);
        const totalSlotVarianceMinutes = sessionReports.reduce((sum, r) => sum + r.slotVarianceMinutes, 0);
        const totalDurationMinutes = sessionReports.every((r) => r.totalDurationMinutes != null)
            ? sessionReports.reduce((sum, r) => sum + (r.totalDurationMinutes ?? 0), 0)
            : null;
        const totalPauseMinutes = Math.round(
            sessionReports.reduce((sum, r) => sum + r.totalPauseDurationSeconds, 0) / 60,
        );
        const avgCompletionRate = Math.round(
            sessionReports.reduce((sum, r) => sum + r.completionRate, 0) / sessionReports.length,
        );

        const fullReport: FullEventReport = {
            eventName: event.name,
            eventDate,
            sessions: sessions.map((session, i) => ({
                serviceSlotName: session.programme.serviceSlot.name,
                slotStartTime: session.programme.serviceSlot.startTime,
                slotEndTime: session.programme.serviceSlot.endTime,
                report: sessionReports[i],
            })),
            summary: {
                sessionCount: sessions.length,
                totalAllocatedMinutes,
                totalSlotVarianceMinutes,
                totalDurationMinutes,
                totalPauseMinutes,
                avgCompletionRate,
            },
        };

        return this.pdfService.generateEventSummaryReport(fullReport);
    }

    async getEventSummaryReportPdfForWorker(eventId: string, memberId: string): Promise<Buffer> {
        await this.assertAdminDeptWorker(memberId);
        return this.getEventSummaryReportPdf(eventId);
    }

    private buildSessionReport(session: ServiceSession): SessionReport {
        const slots = session.sessionSlots ?? [];
        const pauses = session.pauseEntries ?? [];

        const totalPauseMs = pauses.reduce((sum, p) => {
            return p.resumedAt ? sum + (p.resumedAt.getTime() - p.pausedAt.getTime()) : sum;
        }, 0);

        const totalDurationMs =
            session.endedAt && session.startedAt
                ? session.endedAt.getTime() - session.startedAt.getTime()
                : null;

        const completedSlots = slots.filter((s) => s.status === ServiceSessionSlotStatusEnum.COMPLETED).length;

        const formattedSlots: SessionSlotReport[] = slots.map((s) => {
            const allocatedMins = s.adjustedAllocatedMinutes ?? s.programmeSlot?.allocatedMinutes ?? 0;
            const overrunSeconds =
                s.actualSeconds == null ? null : Math.round(s.actualSeconds - allocatedMins * 60);
            const effectiveMember = s.overriddenMember ?? s.programmeSlot?.member;
            return {
                position: s.position,
                type: s.programmeSlot?.type ?? '',
                topic: s.overriddenTopic ?? s.programmeSlot?.topic ?? null,
                speakerName: s.overriddenSpeakerName
                    ?? (effectiveMember ? `${effectiveMember.firstname} ${effectiveMember.lastname}` : null),
                speakerId: effectiveMember?.id ?? null,
                allocatedMinutes: allocatedMins,
                actualSeconds: s.actualSeconds ?? null,
                overrunSeconds,
                status: s.status,
            };
        });

        const totalAllocatedMinutes = formattedSlots.reduce((sum, s) => sum + s.allocatedMinutes, 0);
        const totalOverrunSeconds = formattedSlots
            .filter((s) => s.overrunSeconds != null)
            .reduce((sum, s) => sum + (s.overrunSeconds ?? 0), 0);
        const slotVarianceMinutes = Math.round(totalOverrunSeconds / 60);

        return {
            sessionCode: session.sessionCode,
            programme: {
                id: session.programme.id,
                serviceSlotName: session.programme.serviceSlot?.name ?? null,
            },
            status: session.status,
            startedAt: session.startedAt,
            endedAt: session.endedAt ?? null,
            totalDurationMinutes: totalDurationMs == null ? null : Math.round(totalDurationMs / 60000),
            totalPauseDurationSeconds: Math.round(totalPauseMs / 1000),
            completedSlots,
            totalSlots: slots.length,
            completionRate: slots.length > 0 ? Math.round((completedSlots / slots.length) * 100) : 0,
            totalAllocatedMinutes,
            slotVarianceMinutes,
            slots: formattedSlots,
            pauseCount: pauses.length,
            pauses: pauses.map((p) => ({
                slotPosition: p.slotPosition,
                reason: p.reason,
                pausedAt: p.pausedAt,
                resumedAt: p.resumedAt ?? null,
                durationSeconds: p.resumedAt
                    ? Math.round((p.resumedAt.getTime() - p.pausedAt.getTime()) / 1000)
                    : null,
            })),
        };
    }

    async getAnalytics(from?: string, to?: string, serviceSlotName?: string): Promise<AnalyticsResult> {
        const key = `session:analytics:${from ?? 'all'}:${to ?? 'all'}:${serviceSlotName ?? 'all'}`;
        return this.cacheService.getOrSet(key, () => this.fetchAnalytics(from, to, serviceSlotName), ANALYTICS_TTL);
    }

    private async fetchAnalytics(from?: string, to?: string, serviceSlotName?: string): Promise<AnalyticsResult> {
        const qb = this.sessionRepo
            .createQueryBuilder('session')
            .innerJoinAndSelect('session.programme', 'programme')
            .innerJoinAndSelect('programme.serviceSlot', 'serviceSlot')
            .leftJoinAndSelect('session.sessionSlots', 'sessionSlots')
            .leftJoinAndSelect('sessionSlots.programmeSlot', 'programmeSlot')
            .leftJoinAndSelect('sessionSlots.overriddenMember', 'overriddenMember')
            .leftJoinAndSelect('programmeSlot.member', 'member')
            .leftJoinAndSelect('session.pauseEntries', 'pauseEntries')
            .where('session.status = :status', {status: ServiceSessionStatusEnum.COMPLETED});

        if (from) qb.andWhere('session.startedAt >= :from', {from: new Date(from)});
        if (to) qb.andWhere('session.startedAt <= :to', {to: new Date(to)});
        if (serviceSlotName) qb.andWhere('serviceSlot.name ILIKE :name', {name: `%${serviceSlotName}%`});
        qb.orderBy('session.startedAt', 'DESC');

        const sessions = await qb.getMany();

        type SlotTypeEntry = {total: number; completed: number; totalActualSecs: number; totalAllocatedMins: number; overrunCount: number; overrunTotal: number};
        type SpeakerEntry = {name: string; slotCount: number; totalActualSeconds: number};
        const slotTypeMap = new Map<string, SlotTypeEntry>();
        const speakerMap = new Map<string, SpeakerEntry>();

        const sessionSummaries = sessions.map((session) => {
            const slots = session.sessionSlots ?? [];
            const pauses = session.pauseEntries ?? [];

            const totalPauseMs = pauses.reduce((sum, p) => {
                return p.resumedAt ? sum + (p.resumedAt.getTime() - p.pausedAt.getTime()) : sum;
            }, 0);

            let overrunSlots = 0;
            for (const slot of slots) {
                if (this.accumulateSlotStats(slot, slotTypeMap, speakerMap)) overrunSlots++;
            }

            const completedCount = slots.filter((s) => s.status === ServiceSessionSlotStatusEnum.COMPLETED).length;
            const totalDurationMs =
                session.endedAt && session.startedAt
                    ? session.endedAt.getTime() - session.startedAt.getTime()
                    : null;

            return {
                sessionCode: session.sessionCode,
                startedAt: session.startedAt,
                totalDurationMinutes: totalDurationMs == null ? null : Math.round(totalDurationMs / 60000),
                completionRate: slots.length > 0 ? Math.round((completedCount / slots.length) * 100) : 0,
                overrunSlots,
                totalPauseDurationSeconds: Math.round(totalPauseMs / 1000),
            };
        });

        const slotTypeStats: SlotTypeStats[] = Array.from(slotTypeMap.entries()).map(([type, s]) => ({
            type,
            totalSlots: s.total,
            completedSlots: s.completed,
            avgActualSeconds: s.completed > 0 ? Math.round(s.totalActualSecs / s.completed) : null,
            avgAllocatedMinutes: s.total > 0 ? Math.round(s.totalAllocatedMins / s.total) : 0,
            avgOverrunSeconds: s.overrunCount > 0 ? Math.round(s.overrunTotal / s.overrunCount) : null,
            overrunCount: s.overrunCount,
        }));

        const topSpeakers: TopSpeaker[] = Array.from(speakerMap.entries())
            .map(([memberId, s]) => ({
                memberId,
                name: s.name,
                slotCount: s.slotCount,
                totalActualSeconds: s.totalActualSeconds,
                avgActualSeconds: s.slotCount > 0 ? Math.round(s.totalActualSeconds / s.slotCount) : 0,
            }))
            .sort((a, b) => b.slotCount - a.slotCount)
            .slice(0, 10);

        return {
            from: from ?? null,
            to: to ?? null,
            totalSessions: sessions.length,
            slotTypeStats,
            sessions: sessionSummaries,
            topSpeakers,
        };
    }

    private async assertAdminDeptWorker(memberId: string): Promise<WorkerProfile> {
        const profile = await this.workerProfileRepo.findOne({
            where: {member: {id: memberId}},
            relations: ['department', 'secondaryDepartment'],
        });
        if (
            !profile ||
            (profile.department?.key !== DepartmentKeyEnum.ADMIN &&
                profile.secondaryDepartment?.key !== DepartmentKeyEnum.ADMIN)
        ) {
            throw new ForbiddenException('Only Admin department workers can perform this action');
        }
        return profile;
    }

    private async getAnchorOrThrow(sessionCode: string): Promise<SessionAnchor> {
        const anchor = await this.cacheService.get<SessionAnchor>(this.anchorKey(sessionCode));
        if (!anchor) throw new NotFoundException('Session not found or expired');
        if (anchor.status === ServiceSessionStatusEnum.COMPLETED) {
            throw new BadRequestException('Session has already ended');
        }
        return anchor;
    }

    private async getSessionOrThrow(sessionCode: string, relations: string[] = []): Promise<ServiceSession> {
        const session = await this.sessionRepo.findOne({
            where: {sessionCode},
            relations,
        });
        if (!session) throw new NotFoundException('Session not found');
        return session;
    }

    private async reconstructAnchorFromDb(session: ServiceSession): Promise<SessionAnchor> {
        const inProgress = session.sessionSlots?.find(
            (s) => s.status === ServiceSessionSlotStatusEnum.IN_PROGRESS,
        );
        const position = inProgress?.position ?? 0;
        const startedAt = inProgress?.startedAt?.getTime() ?? Date.now();

        return {
            currentSlotPosition: position,
            slotStartedAt: startedAt,
            slotBaseSeconds: 0,
            status: session.status,
            isPaused: false,
            pausedAt: null,
        };
    }

    private calcElapsed(anchor: SessionAnchor, nowMs: number): number {
        const base = anchor.isPaused && anchor.pausedAt
            ? anchor.slotBaseSeconds + (anchor.pausedAt - anchor.slotStartedAt) / 1000
            : anchor.slotBaseSeconds + (nowMs - anchor.slotStartedAt) / 1000;
        return Math.max(0, base);
    }

    private anchorKey(sessionCode: string): string {
        return this.cacheService.key('session', sessionCode, 'anchor');
    }

    private generateSessionCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const suffix = Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        return `SVC-${suffix}`;
    }

    private async logAction(sessionId: string, role: ServiceActionRoleEnum, action: string, detail: string | null, memberId: string): Promise<void> {
        const member = await this.memberRepo.findOne({where: {id: memberId}});
        const entry = this.actionEntryRepo.create({
            session: {id: sessionId} as ServiceSession,
            actorRole: role,
            action,
            detail,
            performedByMember: member ?? null,
        });
        await this.actionEntryRepo.save(entry);
    }

    private accumulateSlotStats(
        slot: ServiceSessionSlot,
        slotTypeMap: Map<string, {total: number; completed: number; totalActualSecs: number; totalAllocatedMins: number; overrunCount: number; overrunTotal: number}>,
        speakerMap: Map<string, {name: string; slotCount: number; totalActualSeconds: number}>,
    ): boolean {
        const type = slot.programmeSlot?.type ?? 'UNKNOWN';
        let ts = slotTypeMap.get(type);
        if (!ts) {
            ts = {total: 0, completed: 0, totalActualSecs: 0, totalAllocatedMins: 0, overrunCount: 0, overrunTotal: 0};
            slotTypeMap.set(type, ts);
        }
        ts.total++;
        const allocatedMins = slot.adjustedAllocatedMinutes ?? slot.programmeSlot?.allocatedMinutes ?? 0;
        ts.totalAllocatedMins += allocatedMins;

        if (slot.status !== ServiceSessionSlotStatusEnum.COMPLETED || slot.actualSeconds == null) {
            return false;
        }

        ts.completed++;
        ts.totalActualSecs += slot.actualSeconds;
        const overrun = slot.actualSeconds - allocatedMins * 60;
        let isOverrun = false;
        if (overrun > 0) {
            ts.overrunCount++;
            ts.overrunTotal += overrun;
            isOverrun = true;
        }

        if (type === 'SPEAKER') {
            const speakerId = slot.overriddenMember?.id ?? slot.programmeSlot?.member?.id;
            if (speakerId) {
                const m = slot.overriddenMember ?? slot.programmeSlot?.member;
                const name = m ? `${m.firstname} ${m.lastname}` : 'Unknown';
                let sp = speakerMap.get(speakerId);
                if (!sp) {
                    sp = {name, slotCount: 0, totalActualSeconds: 0};
                    speakerMap.set(speakerId, sp);
                }
                sp.slotCount++;
                sp.totalActualSeconds += slot.actualSeconds;
            }
        }

        return isOverrun;
    }

    private dispatchSessionReportEmail(sessionCode: string, serviceName: string): void {
        Promise.all([
            this.findAdminWorkerEmails(),
            this.getFormattedReport(sessionCode).then((r) => this.pdfService.generateSessionReport(r)),
        ]).then(([emails, pdfBuffer]) => {
            if (emails.length === 0) return;
            const date = new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'long', year: 'numeric'});
            this.emailQueueService.queueEmailWithTemplateAndAttachments(
                emails,
                `Session Report: ${serviceName}`,
                'service-session-report',
                {sessionCode, serviceName, date},
                [{filename: `session-report-${sessionCode}.pdf`, content: pdfBuffer}],
            );
        }).catch((err) => this.logger.error('Failed to dispatch session report email', err?.stack));
    }

    private async findAdminWorkerEmails(): Promise<string[]> {
        const workers = await this.workerProfileRepo
            .createQueryBuilder('wp')
            .innerJoinAndSelect('wp.member', 'member')
            .leftJoin('wp.department', 'dept')
            .leftJoin('wp.secondaryDepartment', 'secDept')
            .where('wp.status = :status', {status: WorkerStatusEnum.ACTIVE})
            .andWhere('(dept.key = :key OR secDept.key = :key)', {key: DepartmentKeyEnum.ADMIN})
            .getMany();
        return workers.map((w) => w.member?.email).filter((e): e is string => e != null && e !== '');
    }
}
