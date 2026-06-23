import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrayerMeeting } from '../entity/prayer-meeting.entity';
import { PrayerRosterEntry } from '../entity/prayer-roster-entry.entity';
import { PrayerScheduleRule } from '../entity/prayer-schedule-rule.entity';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';
import { DepartmentLead } from '../../department/entity/department-lead.entity';
import {
  PrayerAssignmentType,
  PrayerMeetingStatus,
  PrayerRosterStatus,
  PrayerRuleType,
} from '../enum/prayer.enum';
import { ReschedulePrayerEntryDto } from '../dto/prayer.dto';
import { WorkerStatusEnum } from '../../member/enums/worker-status.enum';
import { DepartmentLeadTypeEnum } from '../../department/enums/department-lead-type.enum';

interface AssignContext {
  meetings: PrayerMeeting[];
  existingEntries: PrayerRosterEntry[];
  leadMap: Map<string, DepartmentLeadTypeEnum>;
  assignedCount: Map<string, number>;
  capacities: Map<string, number>;
  leaderCounts: Map<string, number>;
  newEntries: Partial<PrayerRosterEntry>[];
  maxPerMeeting: number;
  frequencyRules: PrayerScheduleRule[];
  defaultFrequency: number;
}

@Injectable()
export class PrayerRosterService {
  constructor(
    @InjectRepository(PrayerMeeting)
    private readonly meetingRepo: Repository<PrayerMeeting>,
    @InjectRepository(PrayerRosterEntry)
    private readonly rosterRepo: Repository<PrayerRosterEntry>,
    @InjectRepository(PrayerScheduleRule)
    private readonly ruleRepo: Repository<PrayerScheduleRule>,
    @InjectRepository(WorkerProfile)
    private readonly workerRepo: Repository<WorkerProfile>,
    @InjectRepository(DepartmentLead)
    private readonly deptLeadRepo: Repository<DepartmentLead>,
  ) {}

  async autoAssign(
    month: number,
    year: number,
  ): Promise<{ assigned: number; unassignable: string[] }> {
    const meetings = await this.meetingRepo.find({
      where: { month, year, status: PrayerMeetingStatus.SCHEDULED },
      relations: ['dayConfig', 'rosterEntries', 'rosterEntries.workerProfile'],
      order: { date: 'ASC' },
    });
    if (!meetings.length)
      throw new NotFoundException(
        `No scheduled meetings found for ${year}-${month}.`,
      );

    const { maxPerMeeting, minLeaders, frequencyRules, defaultFrequency } =
      await this.loadRules();

    const activeWorkers = await this.workerRepo.find({
      where: { status: WorkerStatusEnum.ACTIVE },
    });
    const leadMap = await this.buildLeadMap();

    const existingEntries = await this.rosterRepo.find({
      where: { meeting: { month, year }, status: PrayerRosterStatus.SCHEDULED },
      relations: ['workerProfile', 'meeting'],
    });

    const assignedCount = new Map<string, number>();
    for (const entry of existingEntries) {
      const wid = entry.workerProfile.id;
      assignedCount.set(wid, (assignedCount.get(wid) ?? 0) + 1);
    }

    const capacities = new Map(meetings.map((m) => [m.id, m.currentCapacity]));
    const leaderCounts = new Map<string, number>();
    for (const entry of existingEntries) {
      const mid = entry.meeting.id;
      if (leadMap.has(entry.workerProfile.id)) {
        leaderCounts.set(mid, (leaderCounts.get(mid) ?? 0) + 1);
      }
    }

    const ctx: AssignContext = {
      meetings,
      existingEntries,
      leadMap,
      assignedCount,
      capacities,
      leaderCounts,
      newEntries: [],
      maxPerMeeting,
      frequencyRules,
      defaultFrequency,
    };
    const unassignable: string[] = [];

    const unassigned = activeWorkers.filter(
      (w) => (assignedCount.get(w.id) ?? 0) < this.resolveFrequency(w.id, ctx),
    );
    const leaderWorkers = unassigned.filter((w) => leadMap.has(w.id));
    const regularWorkers = unassigned.filter((w) => !leadMap.has(w.id));

    for (const leader of leaderWorkers) {
      if (!this.tryAssignWorker(leader, ctx)) unassignable.push(leader.id);
    }

    this.checkLeaderGaps(ctx, minLeaders, unassignable);

    for (const worker of regularWorkers) {
      if (!this.tryAssignWorker(worker, ctx)) unassignable.push(worker.id);
    }

    if (ctx.newEntries.length) {
      await this.rosterRepo.save(ctx.newEntries as PrayerRosterEntry[]);
      const capacityUpdates = meetings
        .filter(
          (m) =>
            (ctx.capacities.get(m.id) ?? m.currentCapacity) !==
            m.currentCapacity,
        )
        .map((m) => ({
          id: m.id,
          currentCapacity: ctx.capacities.get(m.id) as number,
        }));
      if (capacityUpdates.length) {
        await this.meetingRepo.save(capacityUpdates as PrayerMeeting[]);
      }
    }

    return { assigned: ctx.newEntries.length, unassignable };
  }

  async reschedule(
    entryId: string,
    dto: ReschedulePrayerEntryDto,
  ): Promise<PrayerRosterEntry> {
    const entry = await this.rosterRepo.findOne({
      where: { id: entryId },
      relations: ['workerProfile', 'meeting', 'meeting.dayConfig'],
    });
    if (!entry) throw new NotFoundException('Roster entry not found.');

    const newMeeting = await this.meetingRepo.findOne({
      where: { id: dto.newMeetingId },
      relations: ['dayConfig'],
    });
    if (!newMeeting)
      throw new NotFoundException('Target prayer meeting not found.');
    if (newMeeting.status !== PrayerMeetingStatus.SCHEDULED) {
      throw new BadRequestException(
        'Cannot reschedule to a meeting that is not in scheduled status.',
      );
    }
    if (newMeeting.currentCapacity >= newMeeting.dayConfig.maxCapacity) {
      throw new BadRequestException(
        'The target prayer meeting is fully booked.',
      );
    }

    if (entry.status !== PrayerRosterStatus.SCHEDULED) {
      throw new BadRequestException(
        'Only scheduled entries can be rescheduled.',
      );
    }

    const alreadyOnNewMeeting = await this.rosterRepo.findOne({
      where: {
        workerProfile: { id: entry.workerProfile.id },
        meeting: { id: dto.newMeetingId },
        status: PrayerRosterStatus.SCHEDULED,
      },
    });
    if (alreadyOnNewMeeting) {
      throw new BadRequestException(
        'This worker is already assigned to the target meeting.',
      );
    }

    const newEntry = this.rosterRepo.create({
      workerProfile: entry.workerProfile,
      meeting: newMeeting,
      assignmentType: entry.assignmentType,
      rescheduledFrom: entry,
      reminderTwoDaySent: false,
      reminderDaySent: false,
    });
    const saved = await this.rosterRepo.save(newEntry);

    entry.status = PrayerRosterStatus.RESCHEDULED;
    await this.rosterRepo.save(entry);
    newMeeting.currentCapacity += 1;
    await this.meetingRepo.save(newMeeting);

    const oldMeeting = await this.meetingRepo.findOne({
      where: { id: entry.meeting.id },
    });
    if (oldMeeting && oldMeeting.currentCapacity > 0) {
      oldMeeting.currentCapacity -= 1;
      await this.meetingRepo.save(oldMeeting);
    }

    return saved;
  }

  async validateRoster(
    month: number,
    year: number,
  ): Promise<{ valid: boolean; issues: string[] }> {
    const { minLeaders, frequencyRules, defaultFrequency } =
      await this.loadRules();

    const activeWorkers = await this.workerRepo.find({
      where: { status: WorkerStatusEnum.ACTIVE },
    });
    const leadMap = await this.buildLeadMap();

    const entries = await this.rosterRepo.find({
      where: { meeting: { month, year }, status: PrayerRosterStatus.SCHEDULED },
      relations: ['workerProfile', 'meeting'],
    });

    const meetings = await this.meetingRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.rosterEntries', 're', 're.status = :status', {
        status: PrayerRosterStatus.SCHEDULED,
      })
      .leftJoinAndSelect('re.workerProfile', 'wp')
      .where('m.month = :month AND m.year = :year', { month, year })
      .getMany();

    const issues: string[] = [];

    for (const worker of activeWorkers) {
      const required = this.resolveFrequency(worker.id, {
        leadMap,
        frequencyRules,
        defaultFrequency,
      });
      const assigned = entries.filter(
        (e) => e.workerProfile.id === worker.id,
      ).length;
      if (assigned !== required) {
        issues.push(
          `Worker ${worker.id} has ${assigned} assignment(s) but requires exactly ${required}.`,
        );
      }
    }

    for (const meeting of meetings) {
      const leaderCount = meeting.rosterEntries.filter((e) =>
        leadMap.has(e.workerProfile.id),
      ).length;
      if (leaderCount < minLeaders) {
        issues.push(
          `Meeting on ${meeting.date} has ${leaderCount} leader(s) but requires at least ${minLeaders}.`,
        );
      }
    }

    return { valid: issues.length === 0, issues };
  }

  private async loadRules(): Promise<{
    maxPerMeeting: number;
    minLeaders: number;
    frequencyRules: PrayerScheduleRule[];
    defaultFrequency: number;
  }> {
    const rules = await this.ruleRepo.find({ where: { isActive: true } });
    const maxPerMeeting =
      rules.find((r) => r.type === PrayerRuleType.MAX_PER_MEETING)?.value ??
      Infinity;
    const minLeaders =
      rules.find((r) => r.type === PrayerRuleType.MIN_LEADERS_PER_MEETING)
        ?.value ?? 1;
    const frequencyRules = rules.filter(
      (r) => r.type === PrayerRuleType.ROLE_FREQUENCY,
    );
    const defaultFrequency =
      frequencyRules.find((r) => r.targetLeadType === null)?.value ?? 1;
    return { maxPerMeeting, minLeaders, frequencyRules, defaultFrequency };
  }

  private async buildLeadMap(): Promise<Map<string, DepartmentLeadTypeEnum>> {
    const allLeads = await this.deptLeadRepo.find({
      relations: ['workerProfile'],
    });
    return new Map(allLeads.map((l) => [l.workerProfile.id, l.leadType]));
  }

  private resolveFrequency(
    workerId: string,
    ctx: Pick<AssignContext, 'leadMap' | 'frequencyRules' | 'defaultFrequency'>,
  ): number {
    const leadType = ctx.leadMap.get(workerId);
    if (leadType) {
      const rule = ctx.frequencyRules.find(
        (r) => r.targetLeadType === leadType,
      );
      if (rule) return rule.value;
    }
    return ctx.defaultFrequency;
  }

  private tryAssignWorker(worker: WorkerProfile, ctx: AssignContext): boolean {
    const required = this.resolveFrequency(worker.id, ctx);
    const alreadyAssigned = ctx.assignedCount.get(worker.id) ?? 0;
    const slotsNeeded = required - alreadyAssigned;

    const alreadyAssignedMeetingIds = new Set(
      ctx.existingEntries
        .filter((e) => e.workerProfile.id === worker.id)
        .map((e) => e.meeting.id),
    );

    let slotsAssigned = 0;
    const availableMeetings = [...ctx.meetings].sort(
      (a, b) =>
        (ctx.capacities.get(a.id) ?? 0) - (ctx.capacities.get(b.id) ?? 0),
    );

    for (const meeting of availableMeetings) {
      if (slotsAssigned >= slotsNeeded) break;
      if (alreadyAssignedMeetingIds.has(meeting.id)) continue;
      const cap = ctx.capacities.get(meeting.id) ?? 0;
      if (cap >= Math.min(ctx.maxPerMeeting, meeting.dayConfig.maxCapacity))
        continue;

      ctx.newEntries.push({
        workerProfile: worker,
        meeting,
        assignmentType: PrayerAssignmentType.AUTO_ASSIGNED,
      });
      ctx.capacities.set(meeting.id, cap + 1);
      if (ctx.leadMap.has(worker.id)) {
        ctx.leaderCounts.set(
          meeting.id,
          (ctx.leaderCounts.get(meeting.id) ?? 0) + 1,
        );
      }
      alreadyAssignedMeetingIds.add(meeting.id);
      slotsAssigned++;
    }

    return slotsAssigned === slotsNeeded;
  }

  private checkLeaderGaps(
    ctx: AssignContext,
    minLeaders: number,
    unassignable: string[],
  ): void {
    const meetingsNeedingLeader = ctx.meetings.filter(
      (m) =>
        (ctx.leaderCounts.get(m.id) ?? 0) < minLeaders &&
        (ctx.capacities.get(m.id) ?? 0) < m.dayConfig.maxCapacity,
    );
    const leadTypes = new Set([
      DepartmentLeadTypeEnum.HOD,
      DepartmentLeadTypeEnum.D_HOD,
    ]);
    for (const meeting of meetingsNeedingLeader) {
      if ((ctx.leaderCounts.get(meeting.id) ?? 0) >= minLeaders) continue;
      const hasLeader = ctx.newEntries.some((e) => {
        if (e.meeting?.id !== meeting.id || !e.workerProfile) return false;
        const lt = ctx.leadMap.get(e.workerProfile.id);
        return lt !== undefined && leadTypes.has(lt);
      });
      if (!hasLeader) unassignable.push(`meeting:${meeting.id}:needs-leader`);
    }
  }
}
