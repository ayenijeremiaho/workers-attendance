import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SundaySchoolClass } from '../entity/sunday-school-class.entity';
import { SundaySchoolMember } from '../entity/sunday-school-member.entity';
import { SundaySchoolSession } from '../entity/sunday-school-session.entity';
import { SundaySchoolAttendance } from '../entity/sunday-school-attendance.entity';
import { SundaySchoolAttendanceStatus } from '../enums/sunday-school-attendance-status.enum';
import {
  CreateSundaySchoolClassDto,
  UpdateSundaySchoolClassDto,
} from '../dto/create-sunday-school-class.dto';
import { AssignSundaySchoolMemberDto } from '../dto/assign-sunday-school-member.dto';
import { CreateSundaySchoolSessionDto } from '../dto/create-sunday-school-session.dto';
import { BulkMarkAttendanceDto } from '../dto/bulk-mark-attendance.dto';
import { Member } from '../../member/entity/member.entity';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';
import { MemberAuth } from '../../auth/interface/auth.interface';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { DepartmentKeyEnum } from '../../department/enums/department-key.enum';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { CacheService } from '../../utility/service/cache.service';

export interface SessionRosterEntry {
  memberId: string;
  name: string;
  status: SundaySchoolAttendanceStatus | null;
  markedByTeacher: boolean;
  markedAt: Date | null;
}

export interface SessionRoster {
  sessionId: string;
  classId: string;
  sessionDate: string;
  selfMarkOpen: boolean;
  members: SessionRosterEntry[];
}

@Injectable()
export class SundaySchoolService {
  private readonly logger = new Logger(SundaySchoolService.name);
  private readonly BATCH_SIZE = 100; // Optimal batch size for PostgreSQL

  constructor(
    @InjectRepository(SundaySchoolClass)
    private readonly classRepo: Repository<SundaySchoolClass>,
    @InjectRepository(SundaySchoolMember)
    private readonly memberAssignRepo: Repository<SundaySchoolMember>,
    @InjectRepository(SundaySchoolSession)
    private readonly sessionRepo: Repository<SundaySchoolSession>,
    @InjectRepository(SundaySchoolAttendance)
    private readonly attendanceRepo: Repository<SundaySchoolAttendance>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(WorkerProfile)
    private readonly workerProfileRepo: Repository<WorkerProfile>,
    private readonly cacheService: CacheService,
  ) {}

  async createClass(user: MemberAuth, dto: CreateSundaySchoolClassDto): Promise<SundaySchoolClass> {
    await this.requireSundaySchoolAuth(user);
    this.logger.log(`Creating Sunday School class: ${dto.name}`);
    const entity = this.classRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      teacher: dto.teacherId ? { id: dto.teacherId } : null,
    });
    return this.classRepo.save(entity);
  }

  async updateClass(
    user: MemberAuth,
    id: string,
    dto: UpdateSundaySchoolClassDto,
  ): Promise<SundaySchoolClass> {
    await this.requireSundaySchoolAuth(user, id);
    this.logger.log(`Updating Sunday School class ${id}`);
    const entity = await this.classRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Sunday School class not found');
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.description !== undefined) entity.description = dto.description ?? null;
    if (dto.teacherId !== undefined) {
      entity.teacher = dto.teacherId ? ({ id: dto.teacherId } as Member) : null;
    }
    return this.classRepo.save(entity);
  }

  async deleteClass(id: string): Promise<void> {
    this.logger.log(`Deleting Sunday School class ${id}`);
    const entity = await this.classRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Sunday School class not found');
    await this.classRepo.remove(entity);
  }

  async getAllClasses(page = 1, limit = 20): Promise<PaginationResponseDto<SundaySchoolClass>> {
    const [data, totalCount] = await this.classRepo.findAndCount({
      relations: ['teacher'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) };
  }

  async getClass(id: string): Promise<SundaySchoolClass> {
    const entity = await this.classRepo.findOne({ where: { id }, relations: ['teacher'] });
    if (!entity) throw new NotFoundException('Sunday School class not found');
    return entity;
  }

  async assignMember(
    user: MemberAuth,
    classId: string,
    dto: AssignSundaySchoolMemberDto,
  ): Promise<SundaySchoolMember> {
    await this.requireSundaySchoolAuth(user, classId);
    this.logger.log(`Assigning member ${dto.memberId} to Sunday School class ${classId}`);
    const cls = await this.classRepo.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Sunday School class not found');
    const memberExists = await this.memberRepo.existsBy({ id: dto.memberId });
    if (!memberExists) throw new NotFoundException('Member not found');
    const existing = await this.memberAssignRepo.findOne({
      where: { member: { id: dto.memberId }, sundaySchoolClass: { id: classId } },
    });
    if (existing) throw new BadRequestException('Member is already assigned to this class');
    const assignment = this.memberAssignRepo.create({
      member: { id: dto.memberId } as Member,
      sundaySchoolClass: cls,
    });
    return this.memberAssignRepo.save(assignment);
  }

  async removeMember(user: MemberAuth, classId: string, memberId: string): Promise<void> {
    await this.requireSundaySchoolAuth(user, classId);
    this.logger.log(`Removing member ${memberId} from Sunday School class ${classId}`);
    const assignment = await this.memberAssignRepo.findOne({
      where: { member: { id: memberId }, sundaySchoolClass: { id: classId } },
    });
    if (!assignment) throw new NotFoundException('Member is not assigned to this class');
    await this.memberAssignRepo.remove(assignment);
  }

  async getClassMembers(
    classId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginationResponseDto<SundaySchoolMember>> {
    const cls = await this.classRepo.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Sunday School class not found');
    const [data, totalCount] = await this.memberAssignRepo.findAndCount({
      where: { sundaySchoolClass: { id: classId } },
      relations: ['member'],
      order: { assignedAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) };
  }

  async getSessionsForClass(
    user: MemberAuth,
    classId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginationResponseDto<SundaySchoolSession>> {
    const cls = await this.classRepo.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Sunday School class not found');
    await this.requireSundaySchoolAuth(user, classId);
    const [data, totalCount] = await this.sessionRepo.findAndCount({
      where: { sundaySchoolClass: { id: classId } },
      order: { sessionDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) };
  }

  async getSession(user: MemberAuth, sessionId: string): Promise<SundaySchoolSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['sundaySchoolClass'],
    });
    if (!session) throw new NotFoundException('Session not found');
    await this.requireSundaySchoolAuth(user, session.sundaySchoolClass.id);
    return session;
  }

  async deleteSession(user: MemberAuth, sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['sundaySchoolClass'],
    });
    if (!session) throw new NotFoundException('Session not found');
    await this.requireSundaySchoolAuth(user, session.sundaySchoolClass.id);
    this.logger.log(`Deleting session ${sessionId} for class ${session.sundaySchoolClass.id}`);
    await this.sessionRepo.remove(session);
  }

  async createSession(
    user: MemberAuth,
    dto: CreateSundaySchoolSessionDto,
  ): Promise<SundaySchoolSession> {
    await this.requireSundaySchoolAuth(user, dto.classId);
    this.logger.log(`Creating session for class ${dto.classId} on ${dto.sessionDate}`);
    const cls = await this.classRepo.findOne({ where: { id: dto.classId } });
    if (!cls) throw new NotFoundException('Sunday School class not found');
    const existing = await this.sessionRepo.findOne({
      where: { sundaySchoolClass: { id: dto.classId }, sessionDate: dto.sessionDate },
    });
    if (existing) throw new BadRequestException('A session already exists for this class on that date');
    const session = this.sessionRepo.create({
      sundaySchoolClass: cls,
      sessionDate: dto.sessionDate,
      notes: dto.notes ?? null,
      selfMarkOpen: false,
    });
    return this.sessionRepo.save(session);
  }

  async toggleSelfMark(user: MemberAuth, sessionId: string): Promise<SundaySchoolSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['sundaySchoolClass'],
    });
    if (!session) throw new NotFoundException('Session not found');
    await this.requireSundaySchoolAuth(user, session.sundaySchoolClass.id);
    this.logger.log(`Toggling self-mark for session ${sessionId}`);
    session.selfMarkOpen = !session.selfMarkOpen;
    return this.sessionRepo.save(session);
  }

  async selfMarkPresent(user: MemberAuth, sessionId: string): Promise<SundaySchoolAttendance> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['sundaySchoolClass'],
    });
    if (!session) throw new NotFoundException('Session not found');
    if (!session.selfMarkOpen) {
      throw new BadRequestException('Self-marking is not open for this session');
    }
    const assignment = await this.memberAssignRepo.findOne({
      where: { member: { id: user.id }, sundaySchoolClass: { id: session.sundaySchoolClass.id } },
    });
    if (!assignment) throw new ForbiddenException('You are not assigned to this Sunday School class');
    const existing = await this.attendanceRepo.findOne({
      where: { session: { id: sessionId }, member: { id: user.id } },
    });
    if (existing) {
      if (existing.status === SundaySchoolAttendanceStatus.PRESENT) {
        throw new BadRequestException('You have already marked attendance for this session');
      }
      existing.status = SundaySchoolAttendanceStatus.PRESENT;
      existing.markedByTeacher = false;
      return this.attendanceRepo.save(existing);
    }
    const attendance = this.attendanceRepo.create({
      session: { id: sessionId } as SundaySchoolSession,
      member: { id: user.id } as Member,
      status: SundaySchoolAttendanceStatus.PRESENT,
      markedByTeacher: false,
    });
    return this.attendanceRepo.save(attendance);
  }

  async bulkMarkAttendance(
    user: MemberAuth,
    sessionId: string,
    dto: BulkMarkAttendanceDto,
  ): Promise<SundaySchoolAttendance[]> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['sundaySchoolClass'],
    });
    if (!session) throw new NotFoundException('Session not found');
    await this.requireSundaySchoolAuth(user, session.sundaySchoolClass.id);
    this.logger.log(`Bulk marking attendance for session ${sessionId}`);

    const memberIds = dto.attendances.map((e) => e.memberId);

    // Early return if no attendances to mark
    if (memberIds.length === 0) {
      this.logger.log(`No attendance entries to mark for session ${sessionId}`);
      return [];
    }

    // Use transaction for data consistency
    return this.attendanceRepo.manager.transaction(async (transactionalEntityManager) => {
      // 1 query: which submitted members are actually assigned to this class
      const validAssignments = await transactionalEntityManager.find(SundaySchoolMember, {
        where: {
          sundaySchoolClass: { id: session.sundaySchoolClass.id },
          member: { id: In(memberIds) },
        },
        relations: ['member'],
      });
      const validIds = new Set(validAssignments.map((a) => a.member.id));

      // 1 query: existing attendance records for this session
      const existing = await transactionalEntityManager.find(SundaySchoolAttendance, {
        where: { session: { id: sessionId }, member: { id: In(memberIds) } },
        relations: ['member'],
      });
      const existingMap = new Map(existing.map((a) => [a.member.id, a]));

      const toSave: SundaySchoolAttendance[] = [];
      for (const entry of dto.attendances) {
        if (!validIds.has(entry.memberId)) continue;
        const record = existingMap.get(entry.memberId);
        if (record) {
          record.status = entry.status;
          record.markedByTeacher = true;
          toSave.push(record);
        } else {
          toSave.push(
            this.attendanceRepo.create({
              session: { id: sessionId } as SundaySchoolSession,
              member: { id: entry.memberId } as Member,
              status: entry.status,
              markedByTeacher: true,
            }),
          );
        }
      }

      // 1 batch save instead of N individual saves
      if (toSave.length > 0) {
        const result = await transactionalEntityManager.save(SundaySchoolAttendance, toSave);
        this.logger.log(`Successfully marked ${result.length} attendance records for session ${sessionId}`);
        return result;
      }
      return [];
    });
  }

  async getSessionRoster(user: MemberAuth, sessionId: string): Promise<SessionRoster> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['sundaySchoolClass'],
    });
    if (!session) throw new NotFoundException('Session not found');
    await this.requireSundaySchoolAuth(user, session.sundaySchoolClass.id);

    const [classMembers, attendances] = await Promise.all([
      this.memberAssignRepo.find({
        where: { sundaySchoolClass: { id: session.sundaySchoolClass.id } },
        relations: ['member'],
      }),
      this.attendanceRepo.find({
        where: { session: { id: sessionId } },
        relations: ['member'],
      }),
    ]);

    const attendanceMap = new Map(attendances.map((a) => [a.member.id, a]));

    return {
      sessionId,
      classId: session.sundaySchoolClass.id,
      sessionDate: session.sessionDate,
      selfMarkOpen: session.selfMarkOpen,
      members: classMembers.map((cm) => {
        const att = attendanceMap.get(cm.member.id);
        return {
          memberId: cm.member.id,
          name: `${cm.member.firstname} ${cm.member.lastname}`,
          status: att?.status ?? null,
          markedByTeacher: att?.markedByTeacher ?? false,
          markedAt: att?.markedAt ?? null,
        };
      }),
    };
  }

  // ─── Authorization Helpers ────────────────────────────────────────────────

  /**
   * Grants access to:
   * - ADMIN (always)
   * - Workers whose department name contains "sunday school" (case-insensitive)
   * - The appointed teacher of a specific class (when classId is provided)
   *
   * Workers from other departments can therefore be empowered by being appointed
   * as teacher on a specific class without needing to transfer departments.
   */
  private async requireSundaySchoolAuth(
    user: MemberAuth,
    classId?: string,
  ): Promise<void> {
    if (user.role === MemberRoleEnum.ADMIN) return;

    if (await this.isSundaySchoolDeptWorker(user.id)) return;

    if (classId && (await this.isClassTeacher(user.id, classId))) return;

    throw new ForbiddenException(
      'Only Sunday School staff or the appointed class teacher can perform this operation',
    );
  }

  private async isSundaySchoolDeptWorker(memberId: string): Promise<boolean> {
    const profile = await this.workerProfileRepo.findOne({
      where: { member: { id: memberId } },
      relations: ['department', 'secondaryDepartment'],
    });
    if (!profile) return false;
    return (
      profile.department?.key === DepartmentKeyEnum.SUNDAY_SCHOOL ||
      profile.secondaryDepartment?.key === DepartmentKeyEnum.SUNDAY_SCHOOL
    );
  }

  private async isClassTeacher(memberId: string, classId: string): Promise<boolean> {
    const cls = await this.classRepo.findOne({
      where: { id: classId, teacher: { id: memberId } },
    });
    return !!cls;
  }
}
