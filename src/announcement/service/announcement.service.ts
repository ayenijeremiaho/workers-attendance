import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from '../entity/announcement.entity';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '../dto/create-announcement.dto';
import { AnnouncementAudienceEnum } from '../enum/announcement-audience.enum';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { Department } from '../../department/entity/department.entity';
import { Member } from '../../member/entity/member.entity';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/service/utility.service';
import { SanitizationService } from '../../utility/service/sanitization.service';
import { AuditLogService } from '../../utility/service/audit-log.service';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepo: Repository<Announcement>,
    private readonly sanitizationService: SanitizationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private readonly logger = new Logger(AnnouncementService.name);

  async create(
    dto: CreateAnnouncementDto,
    authorId: string,
  ): Promise<Announcement> {
    if (
      dto.audience === AnnouncementAudienceEnum.DEPARTMENT &&
      !dto.departmentId
    ) {
      throw new BadRequestException(
        'departmentId is required for DEPARTMENT audience',
      );
    }
    if (
      dto.audience === AnnouncementAudienceEnum.INDIVIDUAL &&
      !dto.targetMemberId
    ) {
      throw new BadRequestException(
        'targetMemberId is required for INDIVIDUAL audience',
      );
    }

    const announcement = this.announcementRepo.create({
      title: dto.title,
      body: this.sanitizationService.sanitizeForEmail(dto.body),
      audience: dto.audience ?? AnnouncementAudienceEnum.ALL,
      author: { id: authorId } as Member,
      department: dto.departmentId ? { id: dto.departmentId } : null,
      targetMember: dto.targetMemberId ? { id: dto.targetMemberId } : null,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    const saved = await this.announcementRepo.save(announcement);
    this.logger.log(
      `Announcement "${saved.title}" published to ${saved.audience} audience (id: ${saved.id}) by actor ${authorId}`,
    );
    this.auditLogService.log('ANNOUNCEMENT_CREATED', {
      actorId: authorId,
      targetId: saved.id,
      metadata: { title: saved.title, audience: saved.audience },
    });
    return saved;
  }

  async update(
    id: string,
    dto: UpdateAnnouncementDto,
    actorId: string,
  ): Promise<Announcement> {
    const announcement = await this.getOrThrow(id);

    if (dto.title !== undefined) announcement.title = dto.title;
    if (dto.body !== undefined)
      announcement.body = this.sanitizationService.sanitizeForEmail(dto.body);
    if (dto.audience !== undefined) announcement.audience = dto.audience;
    if (dto.departmentId !== undefined) {
      announcement.department = dto.departmentId
        ? ({ id: dto.departmentId } as Department)
        : null;
    }
    if (dto.targetMemberId !== undefined) {
      announcement.targetMember = dto.targetMemberId
        ? ({ id: dto.targetMemberId } as Member)
        : null;
    }
    if (dto.publishedAt !== undefined)
      announcement.publishedAt = new Date(dto.publishedAt);
    if (dto.expiresAt !== undefined) {
      announcement.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    const saved = await this.announcementRepo.save(announcement);
    this.auditLogService.log('ANNOUNCEMENT_UPDATED', {
      actorId,
      targetId: id,
      metadata: {
        title: saved.title,
        audience: saved.audience,
        changes: Object.keys(dto),
      },
    });
    return saved;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const announcement = await this.getOrThrow(id);
    // Capture title before removal — record is gone after this line
    const { title, audience } = announcement;
    await this.announcementRepo.remove(announcement);
    this.auditLogService.log('ANNOUNCEMENT_DELETED', {
      actorId,
      targetId: id,
      metadata: { title, audience },
    });
  }

  async getById(id: string): Promise<Announcement> {
    return this.getOrThrow(id);
  }

  async getForMember(
    memberId: string,
    role: MemberRoleEnum,
    departmentId: string | null,
    page = 1,
    limit = 10,
  ): Promise<PaginationResponseDto<Announcement>> {
    const now = new Date();

    const qb = this.announcementRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.author', 'author')
      .leftJoinAndSelect('a.department', 'department')
      .leftJoinAndSelect('a.targetMember', 'targetMember')
      .where('(a.publishedAt IS NULL OR a.publishedAt <= :now)', { now })
      .andWhere('(a.expiresAt IS NULL OR a.expiresAt > :now)', { now })
      .orderBy('a.publishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (role === MemberRoleEnum.MEMBER) {
      qb.andWhere(
        '(a.audience = :all OR (a.audience = :individual AND targetMember.id = :memberId))',
        {
          all: AnnouncementAudienceEnum.ALL,
          individual: AnnouncementAudienceEnum.INDIVIDUAL,
          memberId,
        },
      );
    } else if (role === MemberRoleEnum.WORKER && departmentId) {
      qb.andWhere(
        '(a.audience = :all OR a.audience = :workers OR (a.audience = :dept AND department.id = :departmentId) OR (a.audience = :individual AND targetMember.id = :memberId))',
        {
          all: AnnouncementAudienceEnum.ALL,
          workers: AnnouncementAudienceEnum.WORKERS_ONLY,
          dept: AnnouncementAudienceEnum.DEPARTMENT,
          individual: AnnouncementAudienceEnum.INDIVIDUAL,
          departmentId,
          memberId,
        },
      );
    } else {
      qb.andWhere(
        '(a.audience = :all OR a.audience = :workers OR (a.audience = :individual AND targetMember.id = :memberId))',
        {
          all: AnnouncementAudienceEnum.ALL,
          workers: AnnouncementAudienceEnum.WORKERS_ONLY,
          individual: AnnouncementAudienceEnum.INDIVIDUAL,
          memberId,
        },
      );
    }

    const [announcements, total] = await qb.getManyAndCount();
    return UtilityService.createPaginationResponse(
      announcements,
      page,
      limit,
      total,
    );
  }

  async getAll(
    page = 1,
    limit = 10,
    search?: string,
    audience?: AnnouncementAudienceEnum,
  ): Promise<PaginationResponseDto<Announcement>> {
    const qb = this.announcementRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.author', 'author')
      .leftJoinAndSelect('a.department', 'department')
      .leftJoinAndSelect('a.targetMember', 'targetMember')
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (audience) qb.andWhere('a.audience = :audience', { audience });

    if (search) {
      qb.andWhere('LOWER(a.title) LIKE :s', {
        s: `%${search.toLowerCase()}%`,
      });
    }

    const [announcements, total] = await qb.getManyAndCount();
    return UtilityService.createPaginationResponse(
      announcements,
      page,
      limit,
      total,
    );
  }

  private async getOrThrow(id: string): Promise<Announcement> {
    const announcement = await this.announcementRepo.findOne({
      where: { id },
      relations: ['author', 'department', 'targetMember'],
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }
}
