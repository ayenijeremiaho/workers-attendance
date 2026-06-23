import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrayerScheduleConfig } from '../entity/prayer-schedule-config.entity';
import { PrayerDayConfig } from '../entity/prayer-day-config.entity';
import { PrayerScheduleRule } from '../entity/prayer-schedule-rule.entity';
import { PrayerFixedAssignment } from '../entity/prayer-fixed-assignment.entity';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';
import {
  CreatePrayerDayConfigDto,
  CreatePrayerFixedAssignmentDto,
  CreatePrayerScheduleRuleDto,
  UpdatePrayerDayConfigDto,
  UpdatePrayerScheduleRuleDto,
  UpsertPrayerScheduleConfigDto,
} from '../dto/prayer.dto';

@Injectable()
export class PrayerConfigService {
  constructor(
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

  async getDayConfigs(): Promise<PrayerDayConfig[]> {
    return this.dayConfigRepo.find({ order: { dayOfWeek: 'ASC' } });
  }

  async createDayConfig(
    dto: CreatePrayerDayConfigDto,
  ): Promise<PrayerDayConfig> {
    const existing = await this.dayConfigRepo.findOne({
      where: { dayOfWeek: dto.dayOfWeek, isActive: true },
    });
    if (existing)
      throw new BadRequestException(
        `An active day config for day ${dto.dayOfWeek} already exists.`,
      );
    return this.dayConfigRepo.save(this.dayConfigRepo.create(dto));
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

  async getRules(): Promise<PrayerScheduleRule[]> {
    return this.ruleRepo.find({ order: { type: 'ASC' } });
  }

  async createRule(
    dto: CreatePrayerScheduleRuleDto,
  ): Promise<PrayerScheduleRule> {
    return this.ruleRepo.save(this.ruleRepo.create(dto));
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

  async getFixedAssignments(): Promise<PrayerFixedAssignment[]> {
    return this.fixedRepo.find({
      where: { isActive: true },
      relations: ['workerProfile', 'workerProfile.member', 'dayConfig'],
    });
  }

  async createFixedAssignment(
    dto: CreatePrayerFixedAssignmentDto,
  ): Promise<PrayerFixedAssignment> {
    const workerProfile = await this.workerRepo.findOne({
      where: { id: dto.workerProfileId },
    });
    if (!workerProfile)
      throw new NotFoundException('Worker profile not found.');

    const dayConfig = await this.dayConfigRepo.findOne({
      where: { id: dto.dayConfigId, isActive: true },
    });
    if (!dayConfig) throw new NotFoundException('Prayer day config not found.');

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
