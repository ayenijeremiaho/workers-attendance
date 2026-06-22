import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {ChurchSetting} from '../entity/church-setting.entity';
import {ChurchSettingResponseDto, UpdateChurchSettingDto} from '../dto/church-setting.dto';
import {KNOWN_MODULES} from '../constants/known-modules.constant';
import {CacheService} from '../../utility/service/cache.service';
import {AuditLogService} from '../../utility/service/audit-log.service';

@Injectable()
export class ChurchSettingsService {
    private readonly CACHE_TTL = 300;

    constructor(
        @InjectRepository(ChurchSetting)
        private readonly settingRepo: Repository<ChurchSetting>,
        private readonly cacheService: CacheService,
        private readonly auditLogService: AuditLogService,
    ) {}

    private cacheKey(key: string): string {
        return `church-settings:module:${key}`;
    }

    async findAll(): Promise<ChurchSettingResponseDto[]> {
        const rows = await this.settingRepo.find();
        const overrides = new Map(rows.map(r => [r.key, (r.value as {enabled: boolean}).enabled]));
        return KNOWN_MODULES.map(m => ({
            key: m.key,
            moduleName: m.moduleName,
            required: m.required,
            enabled: overrides.get(m.key) ?? true,
        }));
    }

    async findOne(key: string): Promise<ChurchSettingResponseDto> {
        this.assertKnownKey(key);
        const module = KNOWN_MODULES.find(m => m.key === key)!;
        const row = await this.settingRepo.findOne({where: {key}});
        return {
            key,
            moduleName: module.moduleName,
            required: module.required,
            enabled: row ? (row.value as {enabled: boolean}).enabled : true,
        };
    }

    async upsert(key: string, dto: UpdateChurchSettingDto, actorMemberId?: string): Promise<ChurchSettingResponseDto> {
        this.assertKnownKey(key);
        const module = KNOWN_MODULES.find(m => m.key === key)!;

        if (module.required && !dto.enabled) {
            throw new BadRequestException(`Module '${module.moduleName}' is required and cannot be disabled.`);
        }

        let row = await this.settingRepo.findOne({where: {key}});
        if (!row) {
            row = this.settingRepo.create({key, moduleName: module.moduleName, value: {enabled: dto.enabled}});
        } else {
            row.value = {enabled: dto.enabled};
        }
        await this.settingRepo.save(row);
        this.cacheService.del(this.cacheKey(key));

        this.auditLogService.log('CHURCH_SETTING_UPDATED', {
            actorId: actorMemberId,
            targetId: key,
            metadata: {moduleName: module.moduleName, enabled: dto.enabled},
        });

        return {key, moduleName: module.moduleName, required: module.required, enabled: dto.enabled};
    }

    async isEnabled(key: string): Promise<boolean> {
        const cacheKey = this.cacheKey(key);
        const cached = await this.cacheService.get<{enabled: boolean}>(cacheKey);
        if (cached !== undefined) return cached.enabled;

        const row = await this.settingRepo.findOne({where: {key}});
        const enabled = row ? (row.value as {enabled: boolean}).enabled : true;
        this.cacheService.set(cacheKey, {enabled}, this.CACHE_TTL);
        return enabled;
    }

    private assertKnownKey(key: string): void {
        if (!KNOWN_MODULES.some(m => m.key === key)) {
            throw new NotFoundException(`Unknown module key: ${key}`);
        }
    }
}
