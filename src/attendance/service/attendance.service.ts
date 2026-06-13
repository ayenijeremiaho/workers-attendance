import {BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException,} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Between, DataSource, In, Repository} from 'typeorm';
import {ConfigService} from '@nestjs/config';
import {Attendance} from '../entity/attendance.entity';
import {AttendanceStatusEnum} from '../enums/check-in.enum';
import {CheckInDto} from '../dto/check-in.dto';
import {MemberAuth} from '../../auth/interface/auth.interface';
import {MemberRoleEnum} from '../../member/enums/member-role.enum';
import {MemberStatusEnum} from '../../member/enums/member-status.enum';
import {WorkerStatusEnum} from '../../member/enums/worker-status.enum';
import {Member} from '../../member/entity/member.entity';
import {MemberService} from '../../member/service/member.service';
import {ServiceSlot} from '../../event/entity/service-slot.entity';
import {EventService} from '../../event/service/event.service';
import {DepartmentService} from '../../department/service/department.service';
import {UtilityService} from '../../utility/service/utility.service';
import {DateService} from '../../utility/service/date.service';
import {CacheService} from '../../utility/service/cache.service';
import {PaginationResponseDto} from '../../utility/dto/pagination-response.dto';

export interface DepartmentAttendanceSummary {
    departmentId: string;
    departmentName: string;
    totalWorkers: number;
    attendedWorkers: number;
    attendancePercentage: number;
}

export interface DepartmentEventAttendanceResult {
    eventId: string;
    eventName: string;
    slots: { slotId: string; slotName: string; startTime: Date }[];
    workers: {
        workerId: string;
        memberId: string;
        name: string;
        attendance: { slotId: string; status: AttendanceStatusEnum | null; checkinTime: Date | null }[];
    }[];
}

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);
    private readonly leaderboardTtl: number;
    private readonly productName: string;
    private readonly churchName: string;
    private readonly churchAddress: string;
    private readonly enforceDistanceCheck: boolean;

    constructor(
        private readonly dataSource: DataSource,
        private readonly memberService: MemberService,
        private readonly eventService: EventService,
        private readonly departmentService: DepartmentService,
        private readonly configService: ConfigService,
        private readonly utilityService: UtilityService,
        private readonly dateService: DateService,
        private readonly cacheService: CacheService,
        @InjectRepository(Attendance)
        private readonly attendanceRepository: Repository<Attendance>,
        @InjectRepository(ServiceSlot)
        private readonly slotRepository: Repository<ServiceSlot>,
    ) {
        this.leaderboardTtl = this.configService.get<number>('CACHE_TTL_LEADERBOARD_SECONDS', 90);
        this.productName = this.configService.get<string>('PRODUCT_NAME', 'Discovery Hub');
        this.churchName = this.configService.get<string>('CHURCH_NAME', 'RCCG Discovery Centre');
        this.churchAddress = this.configService.get<string>('CHURCH_ADDRESS', '62 Igi Olugbin Street, Bariga. Lagos, Nigeria');
        this.enforceDistanceCheck = this.configService.get<string>('ENFORCE_DISTANCE_CHECK') === 'true';
    }

    async checkin(user: MemberAuth, dto: CheckInDto): Promise<{ message: string }> {
        const [slot, member, existing] = await Promise.all([
            this.getSlotOrThrow(dto.serviceSlotId),
            this.memberService.getById(user.id, ['workerProfile']),
            this.alreadyCheckedIn(user.id, dto.serviceSlotId),
        ]);

        this.assertMemberActive(member);

        if (existing) {
            const time = existing.checkinTime
                ? ` at ${this.dateService.format(existing.checkinTime, DateService.PATTERNS.EMAIL_TIME)}`
                : '';
            throw new BadRequestException(`You have already checked in for this service${time}.`);
        }

        const cfg = this.eventService.resolveSlotConfig(slot);
        const isWorker = member.role === MemberRoleEnum.WORKER;
        const now = this.dateService.now();

        this.validateCheckinWindow(now, slot, cfg, isWorker);

        if (dto.location) {
            this.validateLocation(dto.location, cfg);
        }

        const status = this.resolveStatus(now, slot, cfg, isWorker);

        await this.attendanceRepository.save(
            this.attendanceRepository.create({
                member,
                serviceSlot: slot,
                checkinTime: now,
                status,
                roleAtCheckin: member.role,
                location: dto.location ?? null,
            }),
        );

        const firstName = UtilityService.capitalizeFirstLetter(member.firstname);
        const formattedStartTime = this.dateService.format(slot.startTime, DateService.PATTERNS.EMAIL_DATE);
        const formattedSlotTime = this.dateService.format(slot.startTime, DateService.PATTERNS.EMAIL_TIME);
        const formattedCheckinTime = this.dateService.format(now, DateService.PATTERNS.EMAIL_TIME);

        this.utilityService.sendEmailWithTemplate(
            member.email,
            `${firstName}, ${this.productName} Check-in Confirmed`,
            'checkin-confirmation',
            {
                name: firstName,
                serviceName: slot.name,
                eventDate: formattedStartTime,
                slotTime: formattedSlotTime,
                checkinTime: formattedCheckinTime,
                status: status === AttendanceStatusEnum.LATE ? 'Late' : 'Present',
                churchName: this.churchName,
                churchAddress: this.churchAddress,
            },
        );

        return {message: 'Check-in successful'};
    }

    async markAbsentees(): Promise<void> {
        this.logger.log('Running absence marking job...');

        const slots = await this.eventService.findSlotsNotMarkedAbsent();
        if (!slots.length) {
            this.logger.log('No slots pending absence marking');
            return;
        }

        this.logger.log(`Processing ${slots.length} slot(s) for absence marking`);

        await this.dataSource.transaction(async (manager) => {
            for (const slot of slots) {
                this.logger.log(`Processing slot: ${slot.name} (${slot.id})`);

                const [absentMembers, absentWorkers] = await Promise.all([
                    this.memberService.getMembersNotCheckedInForSlot(slot.id),
                    this.memberService.getWorkersNotCheckedInForSlot(slot.id),
                ]);

                const records: Partial<Attendance>[] = [];

                for (const m of absentMembers) {
                    records.push(this.buildAbsenceRecord(m, slot, MemberRoleEnum.MEMBER, false));
                }

                const onLeaveIds = await this.getBatchApprovedLeave(
                    absentWorkers.map((w) => w.id),
                    slot,
                );
                for (const w of absentWorkers) {
                    records.push(this.buildAbsenceRecord(w, slot, MemberRoleEnum.WORKER, onLeaveIds.has(w.id)));
                }

                if (records.length > 0) {
                    await manager.save(Attendance, records);
                    this.logger.log(`Marked ${records.length} absence(s) for slot "${slot.name}"`);
                }

                await manager.update(ServiceSlot, slot.id, {markedAbsent: true});
            }
        });

        this.logger.log('Absence marking job complete');
    }

    async getMyHistory(
        user: MemberAuth,
        page = 1,
        limit = 10,
        status?: AttendanceStatusEnum,
        dateFrom?: string,
        dateTo?: string,
    ): Promise<PaginationResponseDto<Attendance>> {
        if (page < 1) throw new BadRequestException('Page must be greater than 0');

        const qb = this.attendanceRepository
            .createQueryBuilder('attendance')
            .leftJoinAndSelect('attendance.serviceSlot', 'slot')
            .leftJoinAndSelect('slot.event', 'event')
            .where('attendance.member.id = :memberId', {memberId: user.id})
            .orderBy('attendance.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (status) qb.andWhere('attendance.status = :status', {status});
        if (dateFrom) qb.andWhere('attendance.checkinTime >= :dateFrom', {dateFrom: new Date(dateFrom)});
        if (dateTo) qb.andWhere('attendance.checkinTime <= :dateTo', {dateTo: new Date(dateTo)});

        const [data, total] = await qb.getManyAndCount();
        return UtilityService.createPaginationResponse(data, page, limit, total);
    }

    async getAllHistory(
        page = 1,
        limit = 10,
        memberId?: string,
        slotId?: string,
        status?: AttendanceStatusEnum,
        dateFrom?: string,
        dateTo?: string,
    ): Promise<PaginationResponseDto<Attendance>> {
        if (page < 1) throw new BadRequestException('Page must be greater than 0');

        const qb = this.attendanceRepository
            .createQueryBuilder('attendance')
            .leftJoinAndSelect('attendance.member', 'member')
            .leftJoinAndSelect('member.workerProfile', 'profile')
            .leftJoinAndSelect('profile.department', 'department')
            .leftJoinAndSelect('attendance.serviceSlot', 'slot')
            .leftJoinAndSelect('slot.event', 'event')
            .orderBy('attendance.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (memberId) qb.andWhere('member.id = :memberId', {memberId});
        if (slotId) qb.andWhere('slot.id = :slotId', {slotId});
        if (status) qb.andWhere('attendance.status = :status', {status});
        if (dateFrom) qb.andWhere('attendance.checkinTime >= :dateFrom', {dateFrom: new Date(dateFrom)});
        if (dateTo) qb.andWhere('attendance.checkinTime <= :dateTo', {dateTo: new Date(dateTo)});

        const [data, total] = await qb.getManyAndCount();
        return UtilityService.createPaginationResponse(data, page, limit, total);
    }

    async getDepartmentHistory(user: MemberAuth, slotId: string): Promise<Attendance[]> {
        const deptId = await this.departmentService.getDepartmentIdForLead(user.id);
        if (!deptId) throw new ForbiddenException('You must be a department lead to view this department\'s attendance history.');

        return this.attendanceRepository
            .createQueryBuilder('attendance')
            .leftJoinAndSelect('attendance.member', 'member')
            .leftJoinAndSelect('member.workerProfile', 'profile')
            .leftJoin('profile.department', 'dept')
            .leftJoinAndSelect('attendance.serviceSlot', 'slot')
            .leftJoinAndSelect('slot.event', 'event')
            .where('dept.id = :deptId', {deptId})
            .andWhere('slot.id = :slotId', {slotId})
            .orderBy('attendance.createdAt', 'DESC')
            .getMany();
    }

    async getDepartmentEventAttendance(
        user: MemberAuth,
        eventId: string,
    ): Promise<DepartmentEventAttendanceResult> {
        const deptId = await this.departmentService.getDepartmentIdForLead(user.id);
        if (!deptId) throw new ForbiddenException('You must be a department lead to view this department\'s event attendance.');

        const [slots, workers] = await Promise.all([
            this.slotRepository.find({
                where: {event: {id: eventId}},
                relations: ['event'],
                order: {startTime: 'ASC'},
            }),
            this.departmentService.getWorkersInDepartment(deptId),
        ]);

        if (!slots.length) throw new NotFoundException('Event not found or it has no service slots.');

        const memberIds = workers.map((w) => w.member.id);
        const slotIds = slots.map((s) => s.id);

        const records =
            memberIds.length > 0
                ? await this.attendanceRepository.find({
                    where: {
                        member: {id: In(memberIds)},
                        serviceSlot: {id: In(slotIds)},
                    },
                    relations: ['member', 'serviceSlot'],
                })
                : [];

        const lookup = new Map<string, Attendance>();
        for (const r of records) {
            lookup.set(`${r.member.id}:${r.serviceSlot.id}`, r);
        }

        const event = slots[0].event;

        return {
            eventId,
            eventName: event?.name ?? '',
            slots: slots.map((s) => ({slotId: s.id, slotName: s.name, startTime: s.startTime})),
            workers: workers.map((w) => ({
                workerId: w.id,
                memberId: w.member.id,
                name: `${w.member.firstname} ${w.member.lastname}`,
                attendance: slots.map((s) => {
                    const rec = lookup.get(`${w.member.id}:${s.id}`);
                    return {
                        slotId: s.id,
                        status: rec?.status ?? null,
                        checkinTime: rec?.checkinTime ?? null,
                    };
                }),
            })),
        };
    }

    async getSlotSummary(slotId: string): Promise<Record<AttendanceStatusEnum, number>> {
        const rows = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .select('attendance.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('attendance.serviceSlot.id = :slotId', {slotId})
            .groupBy('attendance.status')
            .getRawMany<{ status: AttendanceStatusEnum; count: string }>();

        const summary: Record<AttendanceStatusEnum, number> = {
            [AttendanceStatusEnum.PRESENT]: 0,
            [AttendanceStatusEnum.LATE]: 0,
            [AttendanceStatusEnum.ABSENT]: 0,
            [AttendanceStatusEnum.ON_LEAVE]: 0,
        };

        for (const row of rows) {
            summary[row.status] = Number.parseInt(row.count, 10);
        }
        return summary;
    }

    async getWorkerLeaderboard(daysAgo = 7, limit = 10): Promise<any[]> {
        const key = this.cacheService.key('leaderboard', `${daysAgo}:${limit}`);
        const cached = await this.cacheService.get<any[]>(key);
        if (cached) return cached;

        const since = this.dateService.daysAgo(daysAgo);

        const rows = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .select('member.id', 'memberId')
            .addSelect('member.firstname', 'firstname')
            .addSelect('member.lastname', 'lastname')
            .addSelect('dept.name', 'departmentName')
            .addSelect(`SUM(CASE WHEN attendance.status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)`, 'presentCount')
            .addSelect(`SUM(CASE WHEN attendance.status = 'ABSENT' THEN 1 ELSE 0 END)`, 'absentCount')
            .innerJoin('attendance.member', 'member')
            .innerJoin('member.workerProfile', 'profile')
            .innerJoin('profile.department', 'dept')
            .where('attendance.createdAt >= :since', {since})
            .andWhere('attendance.roleAtCheckin = :role', {role: MemberRoleEnum.WORKER})
            .andWhere('profile.status = :wStatus', {wStatus: WorkerStatusEnum.ACTIVE})
            .groupBy('member.id, member.firstname, member.lastname, dept.name')
            .orderBy('presentCount', 'DESC')
            .limit(limit)
            .getRawMany();

        const result = rows.map((r, i) => ({
            rank: i + 1,
            name: `${r.firstname} ${r.lastname}`,
            department: r.departmentName,
            presentCount: Number.parseInt(r.presentCount, 10),
            absentCount: Number.parseInt(r.absentCount, 10),
        }));
        this.cacheService.set(key, result, this.leaderboardTtl);
        return result;
    }

    async getPersonalAttendancePercentage(memberId: string, daysAgo = 30): Promise<number> {
        const since = this.dateService.daysAgo(daysAgo);

        const {total, attended} = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .select('COUNT(*)', 'total')
            .addSelect(`SUM(CASE WHEN attendance.status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)`, 'attended')
            .where('attendance.member_id = :memberId', {memberId})
            .andWhere('attendance.createdAt >= :since', {since})
            .getRawOne<{ total: string; attended: string }>();

        const t = Number.parseInt(total ?? '0', 10);
        const a = Number.parseInt(attended ?? '0', 10);
        return t === 0 ? 0 : Math.min(Number(((a / t) * 100).toFixed(2)), 100);
    }

    async getWorkerAttendancePercentage(daysAgo = 30, departmentId?: string): Promise<number> {
        const since = this.dateService.daysAgo(daysAgo);

        const totalWorkers = await this.memberService.count({
            where: {
                role: MemberRoleEnum.WORKER,
                ...(departmentId ? {workerProfile: {department: {id: departmentId}}} : {}),
            },
        });

        if (totalWorkers === 0) return 0;

        const qb = this.attendanceRepository
            .createQueryBuilder('attendance')
            .innerJoin('attendance.member', 'member')
            .innerJoin('member.workerProfile', 'profile')
            .where('attendance.createdAt >= :since', {since})
            .andWhere(`attendance.status IN ('PRESENT','LATE')`)
            .andWhere('profile.status = :wStatus', {wStatus: WorkerStatusEnum.ACTIVE});

        if (departmentId) qb.andWhere('profile.department.id = :departmentId', {departmentId});

        const {count} = await qb
            .select('COUNT(DISTINCT member.id)', 'count')
            .getRawOne<{ count: string }>();

        const attended = Number.parseInt(count ?? '0', 10);
        return Math.min(Number(((attended / totalWorkers) * 100).toFixed(2)), 100);
    }

    async getCongregationAttendancePercentage(daysAgo = 30): Promise<number> {
        const since = this.dateService.daysAgo(daysAgo);

        const totalActive = await this.memberService.count({
            where: {status: MemberStatusEnum.ACTIVE},
        });
        if (totalActive === 0) return 0;

        const {count} = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .select('COUNT(DISTINCT attendance.member_id)', 'count')
            .where('attendance.createdAt >= :since', {since})
            .andWhere(`attendance.status IN ('PRESENT','LATE')`)
            .getRawOne<{ count: string }>();

        const attended = Number.parseInt(count ?? '0', 10);
        return Math.min(Number(((attended / totalActive) * 100).toFixed(2)), 100);
    }

    async getDepartmentAttendanceSummary(daysAgo = 30): Promise<DepartmentAttendanceSummary[]> {
        const since = this.dateService.daysAgo(daysAgo);

        const rows = await this.dataSource
            .createQueryBuilder()
            .select('dept.id', 'departmentId')
            .addSelect('dept.name', 'departmentName')
            .addSelect('COUNT(DISTINCT wp.member_id)', 'totalWorkers')
            .addSelect(
                `COUNT(DISTINCT CASE WHEN a.status IN ('PRESENT','LATE') THEN a.member_id END)`,
                'attendedWorkers',
            )
            .from('departments', 'dept')
            .leftJoin('worker_profiles', 'wp', "wp.department_id = dept.id AND wp.status = 'ACTIVE'")
            .leftJoin(
                'attendances',
                'a',
                "a.member_id = wp.member_id AND a.created_at >= :since AND a.role_at_checkin = 'WORKER'",
                {since},
            )
            .groupBy('dept.id, dept.name')
            .orderBy('dept.name', 'ASC')
            .getRawMany<{
                departmentId: string;
                departmentName: string;
                totalWorkers: string;
                attendedWorkers: string;
            }>();

        return rows.map((r) => {
            const total = Number.parseInt(r.totalWorkers, 10);
            const attended = Number.parseInt(r.attendedWorkers, 10);
            return {
                departmentId: r.departmentId,
                departmentName: r.departmentName,
                totalWorkers: total,
                attendedWorkers: attended,
                attendancePercentage:
                    total === 0 ? 0 : Math.min(Number(((attended / total) * 100).toFixed(2)), 100),
            };
        });
    }

    async getNewMemberRegistrationsTrend(
        daysAgo = 90,
    ): Promise<{ week: string; newMembers: number; newWorkers: number }[]> {
        const since = this.dateService.daysAgo(daysAgo);

        const rows = await this.dataSource
            .createQueryBuilder()
            .select("TO_CHAR(DATE_TRUNC('week', m.created_at), 'YYYY-MM-DD')", 'week')
            .addSelect(`SUM(CASE WHEN m.role = 'MEMBER' THEN 1 ELSE 0 END)`, 'newMembers')
            .addSelect(`SUM(CASE WHEN m.role = 'WORKER' THEN 1 ELSE 0 END)`, 'newWorkers')
            .from('members', 'm')
            .where('m.created_at >= :since', {since})
            .groupBy("DATE_TRUNC('week', m.created_at)")
            .orderBy("DATE_TRUNC('week', m.created_at)", 'ASC')
            .getRawMany<{ week: string; newMembers: string; newWorkers: string }>();

        return rows.map((r) => ({
            week: r.week,
            newMembers: Number.parseInt(r.newMembers, 10),
            newWorkers: Number.parseInt(r.newWorkers, 10),
        }));
    }

    async getAttendanceStreak(memberId: string, role: MemberRoleEnum): Promise<number> {
        const records = await this.attendanceRepository.find({
            where: {member: {id: memberId}, roleAtCheckin: role},
            order: {createdAt: 'DESC'},
            select: ['status'],
        });

        let streak = 0;
        for (const record of records) {
            if (
                record.status === AttendanceStatusEnum.PRESENT ||
                record.status === AttendanceStatusEnum.LATE ||
                record.status === AttendanceStatusEnum.ON_LEAVE
            ) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    async getPeriodStats(
        memberId: string,
        daysAgo: number,
    ): Promise<{ present: number; late: number; absent: number; onLeave: number; total: number }> {
        const since = this.dateService.daysAgo(daysAgo);
        const rows = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .select('attendance.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('attendance.member_id = :memberId', {memberId})
            .andWhere('attendance.createdAt >= :since', {since})
            .groupBy('attendance.status')
            .getRawMany<{ status: AttendanceStatusEnum; count: string }>();

        const stats = {present: 0, late: 0, absent: 0, onLeave: 0, total: 0};
        for (const row of rows) {
            const n = Number.parseInt(row.count, 10);
            stats.total += n;
            if (row.status === AttendanceStatusEnum.PRESENT) stats.present = n;
            if (row.status === AttendanceStatusEnum.LATE) stats.late = n;
            if (row.status === AttendanceStatusEnum.ABSENT) stats.absent = n;
            if (row.status === AttendanceStatusEnum.ON_LEAVE) stats.onLeave = n;
        }
        return stats;
    }

    async getMemberRank(memberId: string, daysAgo: number, role: MemberRoleEnum): Promise<number> {
        const since = this.dateService.daysAgo(daysAgo);
        const rows = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .select('attendance.member_id', 'memberId')
            .addSelect(`SUM(CASE WHEN attendance.status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)`, 'score')
            .where('attendance.roleAtCheckin = :role', {role})
            .andWhere('attendance.createdAt >= :since', {since})
            .groupBy('attendance.member_id')
            .orderBy('score', 'DESC')
            .getRawMany<{ memberId: string; score: string }>();

        const index = rows.findIndex((r) => r.memberId === memberId);
        return index === -1 ? rows.length + 1 : index + 1;
    }

    async getWeeklyAttendanceTrend(daysAgo = 90): Promise<{ week: string; present: number; absent: number }[]> {
        const since = this.dateService.daysAgo(daysAgo);
        const rows = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .select("TO_CHAR(DATE_TRUNC('week', attendance.createdAt), 'YYYY-MM-DD')", 'week')
            .addSelect(`SUM(CASE WHEN attendance.status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)`, 'present')
            .addSelect(`SUM(CASE WHEN attendance.status = 'ABSENT' THEN 1 ELSE 0 END)`, 'absent')
            .where('attendance.createdAt >= :since', {since})
            .groupBy("DATE_TRUNC('week', attendance.createdAt)")
            .orderBy("DATE_TRUNC('week', attendance.createdAt)", 'ASC')
            .getRawMany<{ week: string; present: string; absent: string }>();

        return rows.map((r) => ({
            week: r.week,
            present: Number.parseInt(r.present, 10),
            absent: Number.parseInt(r.absent, 10),
        }));
    }

    async getMembersNotSeenSince(daysAgo = 30, limit = 20): Promise<
        { id: string; name: string; email: string; lastSeen: Date | null }[]
    > {
        const since = this.dateService.daysAgo(daysAgo);
        const rows = await this.dataSource
            .createQueryBuilder()
            .select('m.id', 'id')
            .addSelect('m.firstname', 'firstname')
            .addSelect('m.lastname', 'lastname')
            .addSelect('m.email', 'email')
            .addSelect('MAX(a.checkin_time)', 'lastSeen')
            .from('members', 'm')
            .leftJoin(
                'attendances',
                'a',
                "a.member_id = m.id AND a.status IN ('PRESENT','LATE')",
            )
            .where('m.status = :status', {status: 'ACTIVE'})
            .groupBy('m.id, m.firstname, m.lastname, m.email')
            .having('MAX(a.checkin_time) < :since OR MAX(a.checkin_time) IS NULL', {since})
            .orderBy('MAX(a.checkin_time)', 'ASC', 'NULLS FIRST')
            .limit(limit)
            .getRawMany<{ id: string; firstname: string; lastname: string; email: string; lastSeen: Date | null }>();

        return rows.map((r) => ({
            id: r.id,
            name: `${r.firstname} ${r.lastname}`,
            email: r.email,
            lastSeen: r.lastSeen ?? null,
        }));
    }

    async getTopAbsentMembers(
        daysAgo = 30,
        limit = 10,
        role?: MemberRoleEnum,
    ): Promise<{ id: string; name: string; department: string | null; absentCount: number }[]> {
        const since = this.dateService.daysAgo(daysAgo);

        const qb = this.attendanceRepository
            .createQueryBuilder('attendance')
            .select('member.id', 'id')
            .addSelect('member.firstname', 'firstname')
            .addSelect('member.lastname', 'lastname')
            .addSelect('dept.name', 'department')
            .addSelect(`SUM(CASE WHEN attendance.status = 'ABSENT' THEN 1 ELSE 0 END)`, 'absentCount')
            .innerJoin('attendance.member', 'member')
            .leftJoin('member.workerProfile', 'profile')
            .leftJoin('profile.department', 'dept')
            .where('attendance.createdAt >= :since', {since})
            .groupBy('member.id, member.firstname, member.lastname, dept.name')
            .having(`SUM(CASE WHEN attendance.status = 'ABSENT' THEN 1 ELSE 0 END) > 0`)
            .orderBy('absentCount', 'DESC')
            .limit(limit);

        if (role) qb.andWhere('attendance.roleAtCheckin = :role', {role});

        const rows = await qb.getRawMany<{
            id: string; firstname: string; lastname: string; department: string | null; absentCount: string;
        }>();

        return rows.map((r) => ({
            id: r.id,
            name: `${r.firstname} ${r.lastname}`,
            department: r.department ?? null,
            absentCount: Number.parseInt(r.absentCount, 10),
        }));
    }

    async getTotalCheckInsToday(): Promise<number> {
        const startOfDay = this.dateService.startOfDay();
        const endOfDay = this.dateService.endOfDay();
        return this.attendanceRepository.count({
            where: {checkinTime: Between(startOfDay, endOfDay)},
        });
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private async getSlotOrThrow(slotId: string): Promise<ServiceSlot> {
        const slot = await this.slotRepository.findOne({
            where: {id: slotId},
            relations: ['config', 'config.defaultVenue', 'venueOverride'],
        });
        if (!slot) throw new NotFoundException('Service slot not found');
        return slot;
    }

    private assertMemberActive(member: Member): void {
        if (member.status === MemberStatusEnum.INACTIVE) {
            throw new BadRequestException('Your account is inactive. Contact admin.');
        }
        if (
            member.role === MemberRoleEnum.WORKER &&
            member.workerProfile?.status === WorkerStatusEnum.INACTIVE
        ) {
            throw new BadRequestException('Your worker account is suspended. Contact admin.');
        }
    }

    private validateCheckinWindow(
        now: Date,
        slot: ServiceSlot,
        cfg: ReturnType<EventService['resolveSlotConfig']>,
        isWorker: boolean,
    ): void {
        const startOffset = isWorker
            ? cfg.workerCheckinStartOffsetSeconds
            : cfg.memberCheckinStartOffsetSeconds;

        const openTime = this.dateService.addSeconds(slot.startTime, startOffset);
        const closeTime = this.dateService.addSeconds(slot.startTime, cfg.checkinStopOffsetSeconds);

        if (this.dateService.isBefore(now, openTime)) {
            throw new BadRequestException('Check-in has not opened yet.');
        }
        if (this.dateService.isAfter(now, closeTime)) {
            throw new BadRequestException('Check-in is closed.');
        }
    }

    private validateLocation(
        location: { latitude: number; longitude: number },
        cfg: ReturnType<EventService['resolveSlotConfig']>,
    ): void {
        const distance = UtilityService.calculateDistanceInMeters(
            location.latitude,
            location.longitude,
            cfg.venue.latitude,
            cfg.venue.longitude,
        );
        if (distance > cfg.allowedDistanceInMeters && this.enforceDistance()) {
            throw new BadRequestException('You are too far from the venue to check in.');
        }
    }

    private resolveStatus(
        now: Date,
        slot: ServiceSlot,
        cfg: ReturnType<EventService['resolveSlotConfig']>,
        isWorker: boolean,
    ): AttendanceStatusEnum {
        if (!isWorker) return AttendanceStatusEnum.PRESENT;
        const lateThreshold = this.dateService.addSeconds(slot.startTime, cfg.workerLateOffsetSeconds);
        return this.dateService.isSameOrAfter(now, lateThreshold)
            ? AttendanceStatusEnum.LATE
            : AttendanceStatusEnum.PRESENT;
    }

    private buildAbsenceRecord(
        member: Member,
        slot: ServiceSlot,
        role: MemberRoleEnum,
        onLeave: boolean,
    ): Partial<Attendance> {
        return {
            member,
            serviceSlot: slot,
            checkinTime: null,
            status: onLeave ? AttendanceStatusEnum.ON_LEAVE : AttendanceStatusEnum.ABSENT,
            roleAtCheckin: role,
            location: null,
        };
    }

    private async alreadyCheckedIn(memberId: string, slotId: string): Promise<Attendance | null> {
        return this.attendanceRepository.findOne({
            where: {member: {id: memberId}, serviceSlot: {id: slotId}},
            select: {id: true, status: true, checkinTime: true},
        });
    }

    private async getBatchApprovedLeave(memberIds: string[], slot: ServiceSlot): Promise<Set<string>> {
        if (!memberIds.length) return new Set();
        const rows = await this.dataSource
            .createQueryBuilder()
            .select('profile.member_id', 'memberId')
            .from('request_leave', 'leave')
            .innerJoin('worker_profiles', 'profile', 'profile.id = leave.worker_profile_id')
            .where('profile.member_id IN (:...memberIds)', {memberIds})
            .andWhere('leave.status = :status', {status: 'APPROVED'})
            .andWhere('leave.date_from <= :slotEnd', {slotEnd: slot.endTime})
            .andWhere('leave.date_to >= :slotStart', {slotStart: slot.startTime})
            .getRawMany<{ memberId: string }>();
        return new Set(rows.map((r) => r.memberId));
    }

    private enforceDistance(): boolean {
        return this.enforceDistanceCheck;
    }
}
