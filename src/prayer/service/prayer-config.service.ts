import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrayerProgram } from '../entity/prayer-program.entity';
import { PrayerScheduleConfig } from '../entity/prayer-schedule-config.entity';
import { PrayerDayConfig } from '../entity/prayer-day-config.entity';
import { PrayerScheduleRule } from '../entity/prayer-schedule-rule.entity';
import { PrayerFixedAssignment } from '../entity/prayer-fixed-assignment.entity';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';
import {
  ClonePrayerProgramDto,
  CreatePrayerDayConfigDto,
  CreatePrayerFixedAssignmentDto,
  CreatePrayerProgramDto,
  CreatePrayerScheduleRuleDto,
  UpdatePrayerDayConfigDto,
  UpdatePrayerProgramDto,
  UpdatePrayerScheduleRuleDto,
  UpsertPrayerScheduleConfigDto,
} from '../dto/prayer.dto';

@Injectable()
export class PrayerConfigService {
  constructor(
    @InjectRepository(PrayerProgram)
    private readonly programRepo: Repository<PrayerProgram>,
    @InjectRepository(PrayerScheduleConfig)
    private readonly configRepo: Repository<PrayerScheduleConfig>,
    @InjectRepository(PrayerDayConfig)
    private readonly dayConfigRepo: Repository<PrayerDayConfig>,
    @InjectRepository(PrayerScheduleRule)
    private readonly ruleRepo: Repository<PrayerScheduleRule>,
    @InjectRepository(PrayerFixedAssignment)
    private readonly fixedRepo: Repository<PrayerFixedAssignment>,
    @InjectRepository(WorkerProfile)
    private readonly workerRepo: Repository<WorkerProfile>,
  ) {}

  // ── Programs ────────────────────────────────────────────────────────────────

  async listPrograms(): Promise<PrayerProgram[]> {
    return this.programRepo.find({ order: { createdAt: 'ASC' } });
  }

  async createProgram(dto: CreatePrayerProgramDto): Promise<PrayerProgram> {
    return this.programRepo.save(
      this.programRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        audience: dto.audience,
        selectionWindowDays: dto.selectionWindowDays ?? 7,
      }),
    );
  }

  async updateProgram(
    id: string,
    dto: UpdatePrayerProgramDto,
  ): Promise<PrayerProgram> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Prayer program not found.');
    Object.assign(program, dto);
    return this.programRepo.save(program);
  }

  async deactivateProgram(id: string): Promise<void> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Prayer program not found.');
    program.isActive = false;
    await this.programRepo.save(program);
  }

  async cloneProgram(
    sourceId: string,
    dto: ClonePrayerProgramDto,
  ): Promise<PrayerProgram> {
    const source = await this.programRepo.findOne({ where: { id: sourceId } });
    if (!source) throw new NotFoundException('Source prayer program not found.');

    const newProgram = await this.programRepo.save(
      this.programRepo.create({
        name: dto.name,
        description: dto.description ?? source.description,
        audience: dto.audience ?? source.audience,
        selectionWindowDays: dto.selectionWindowDays ?? source.selectionWindowDays,
      }),
    );

    const [dayConfigs, rules] = await Promise.all([
      this.dayConfigRepo.find({ where: { program: { id: sourceId } } }),
      this.ruleRepo.find({ where: { program: { id: sourceId } } }),
    ]);

    await Promise.all([
      this.dayConfigRepo.save(
        dayConfigs.map((d) =>
          this.dayConfigRepo.create({
            dayOfWeek: d.dayOfWeek,
            mode: d.mode,
            startTime: d.startTime,
            endTime: d.endTime,
            maxCapacity: d.maxCapacity,
            isActive: d.isActive,
            program: newProgram,
          }),
        ),
      ),
      this.ruleRepo.save(
        rules.map((r) =>
          this.ruleRepo.create({
            type: r.type,
            targetLeadType: r.targetLeadType,
            value: r.value,
            description: r.description,
            isActive: r.isActive,
            program: newProgram,
          }),
        ),
      ),
    ]);

    if (dto.includeFixedAssignments) {
      const fixedAssignments = await this.fixedRepo.find({
        where: { isActive: true, dayConfig: { program: { id: sourceId } } },
        relations: ['workerProfile', 'dayConfig'],
      });

      const newDayConfigs = await this.dayConfigRepo.find({
        where: { program: { id: newProgram.id } },
      });

      await this.fixedRepo.save(
        fixedAssignments
          .map((fa) => {
            const matchingDay = newDayConfigs.find(
              (d) => d.dayOfWeek === fa.dayConfig.dayOfWeek,
            );
            if (!matchingDay) return null;
            return this.fixedRepo.create({
              workerProfile: fa.workerProfile,
              dayConfig: matchingDay,
              isActive: true,
            });
          })
          .filter(Boolean),
      );
    }

    return newProgram;
  }

  async getProgram(id: string): Promise<PrayerProgram> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Prayer program not found.');
    return program;
  }

  // ── Legacy global config (kept for backward compat) ────────────────────────

  async getConfig(): Promise<PrayerScheduleConfig> {
    let config = await this.configRepo.findOne({ where: { isActive: true } });
    if (!config) {
      config = await this.configRepo.save(
        this.configRepo.create({ selectionWindowDays: 7, isActive: true }),
      );
    }
    return config;
  }

  async upsertConfig(
    dto: UpsertPrayerScheduleConfigDto,
  ): Promise<PrayerScheduleConfig> {
    const config = await this.getConfig();
    config.selectionWindowDays = dto.selectionWindowDays;
    return this.configRepo.save(config);
  }

  // ── Day Configs ─────────────────────────────────────────────────────────────

  async getDayConfigs(programId: string): Promise<PrayerDayConfig[]> {
    await this.getProgram(programId);
    return this.dayConfigRepo.find({
      where: { program: { id: programId } },
      order: { dayOfWeek: 'ASC' },
    });
  }

  async createDayConfig(
    programId: string,
    dto: CreatePrayerDayConfigDto,
  ): Promise<PrayerDayConfig> {
    const program = await this.getProgram(programId);
    const existing = await this.dayConfigRepo.findOne({
      where: { dayOfWeek: dto.dayOfWeek, isActive: true, program: { id: programId } },
    });
    if (existing)
      throw new BadRequestException(
        `An active day config for day ${dto.dayOfWeek} already exists in this program.`,
      );
    return this.dayConfigRepo.save(this.dayConfigRepo.create({ ...dto, program }));
  }

  async updateDayConfig(
    id: string,
    dto: UpdatePrayerDayConfigDto,
  ): Promise<PrayerDayConfig> {
    const config = await this.dayConfigRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Prayer day config not found.');
    Object.assign(config, dto);
    return this.dayConfigRepo.save(config);
  }

  // ── Rules ───────────────────────────────────────────────────────────────────

  async getRules(programId: string): Promise<PrayerScheduleRule[]> {
    await this.getProgram(programId);
    return this.ruleRepo.find({
      where: { program: { id: programId } },
      order: { type: 'ASC' },
    });
  }

  async createRule(
    programId: string,
    dto: CreatePrayerScheduleRuleDto,
  ): Promise<PrayerScheduleRule> {
    const program = await this.getProgram(programId);
    return this.ruleRepo.save(this.ruleRepo.create({ ...dto, program }));
  }

  async updateRule(
    id: string,
    dto: UpdatePrayerScheduleRuleDto,
  ): Promise<PrayerScheduleRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Prayer schedule rule not found.');
    Object.assign(rule, dto);
    return this.ruleRepo.save(rule);
  }

  // ── Fixed Assignments ────────────────────────────────────────────────────────

  async getFixedAssignments(programId: string): Promise<PrayerFixedAssignment[]> {
    await this.getProgram(programId);
    return this.fixedRepo.find({
      where: { isActive: true, dayConfig: { program: { id: programId } } },
      relations: ['workerProfile', 'workerProfile.member', 'dayConfig'],
    });
  }

  async createFixedAssignment(
    programId: string,
    dto: CreatePrayerFixedAssignmentDto,
  ): Promise<PrayerFixedAssignment> {
    const workerProfile = await this.workerRepo.findOne({
      where: { id: dto.workerProfileId },
    });
    if (!workerProfile)
      throw new NotFoundException('Worker profile not found.');

    const dayConfig = await this.dayConfigRepo.findOne({
      where: { id: dto.dayConfigId, isActive: true, program: { id: programId } },
      relations: ['program'],
    });
    if (!dayConfig)
      throw new NotFoundException('Prayer day config not found in this program.');

    const existing = await this.fixedRepo.findOne({
      where: {
        workerProfile: { id: dto.workerProfileId },
        dayConfig: { id: dto.dayConfigId },
        isActive: true,
      },
    });
    if (existing)
      throw new BadRequestException(
        'This worker already has a fixed assignment for this day.',
      );

    return this.fixedRepo.save(
      this.fixedRepo.create({ workerProfile, dayConfig, isActive: true }),
    );
  }

  async removeFixedAssignment(id: string): Promise<void> {
    const assignment = await this.fixedRepo.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException('Fixed assignment not found.');
    assignment.isActive = false;
    await this.fixedRepo.save(assignment);
  }
}
