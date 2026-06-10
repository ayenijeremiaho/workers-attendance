import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchClass } from '../entity/church-class.entity';
import { ClassEnrollment } from '../entity/class-enrollment.entity';
import { Member } from '../../member/entity/member.entity';
import { CreateChurchClassDto, UpdateChurchClassDto } from '../dto/create-church-class.dto';
import { EnrollMemberDto } from '../dto/enroll-member.dto';
import { EnrollmentStatusEnum } from '../enum/enrollment-status.enum';
import { ChurchClassTypeEnum } from '../enum/church-class-type.enum';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/service/utility.service';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(ChurchClass)
    private readonly classRepo: Repository<ChurchClass>,
    @InjectRepository(ClassEnrollment)
    private readonly enrollmentRepo: Repository<ClassEnrollment>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
  ) {}

  async createClass(dto: CreateChurchClassDto): Promise<ChurchClass> {
    const churchClass = this.classRepo.create({
      name: dto.name,
      type: dto.type,
      description: dto.description ?? null,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      facilitator: dto.facilitatorId ? { id: dto.facilitatorId } : null,
    });
    return this.classRepo.save(churchClass);
  }

  async updateClass(id: string, dto: UpdateChurchClassDto): Promise<ChurchClass> {
    const churchClass = await this.getClassOrThrow(id);

    if (dto.name !== undefined) churchClass.name = dto.name;
    if (dto.description !== undefined) churchClass.description = dto.description;
    if (dto.startDate !== undefined) churchClass.startDate = dto.startDate;
    if (dto.endDate !== undefined) churchClass.endDate = dto.endDate;
    if (dto.facilitatorId !== undefined) {
      churchClass.facilitator = dto.facilitatorId ? ({ id: dto.facilitatorId } as Member) : null;
    }

    return this.classRepo.save(churchClass);
  }

  async deleteClass(id: string): Promise<void> {
    const churchClass = await this.getClassOrThrow(id);
    await this.classRepo.remove(churchClass);
  }

  async getClass(id: string): Promise<ChurchClass> {
    const churchClass = await this.classRepo.findOne({
      where: { id },
      relations: ['facilitator'],
    });
    if (!churchClass) throw new NotFoundException('Class not found');
    return churchClass;
  }

  async getAllClasses(
    type?: ChurchClassTypeEnum,
    page = 1,
    limit = 10,
  ): Promise<PaginationResponseDto<ChurchClass>> {
    const query = this.classRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.facilitator', 'facilitator')
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) query.where('c.type = :type', { type });

    const [classes, total] = await query.getManyAndCount();
    return UtilityService.createPaginationResponse(classes, page, limit, total);
  }

  async enrollMember(dto: EnrollMemberDto): Promise<ClassEnrollment> {
    const churchClass = await this.getClassOrThrow(dto.classId);

    const memberExists = await this.memberRepo.existsBy({ id: dto.memberId });
    if (!memberExists) throw new NotFoundException('Member not found');

    const existing = await this.enrollmentRepo.findOne({
      where: {
        member: { id: dto.memberId },
        churchClass: { id: dto.classId },
      },
    });
    if (existing) throw new BadRequestException('Member is already enrolled in this class');

    const enrollment = this.enrollmentRepo.create({
      member: { id: dto.memberId } as Member,
      churchClass,
      status: EnrollmentStatusEnum.IN_PROGRESS,
    });
    return this.enrollmentRepo.save(enrollment);
  }

  async updateEnrollmentStatus(
    enrollmentId: string,
    status: EnrollmentStatusEnum,
  ): Promise<ClassEnrollment> {
    const enrollment = await this.getEnrollmentOrThrow(enrollmentId);

    enrollment.status = status;
    if (status === EnrollmentStatusEnum.COMPLETED) {
      enrollment.completedAt = new Date();
      enrollment.cancelledAt = null;
    } else if (status === EnrollmentStatusEnum.CANCELLED) {
      enrollment.cancelledAt = new Date();
      enrollment.completedAt = null;
    }

    return this.enrollmentRepo.save(enrollment);
  }

  async getMyEnrollments(memberId: string): Promise<ClassEnrollment[]> {
    return this.enrollmentRepo.find({
      where: { member: { id: memberId } },
      relations: ['churchClass'],
      order: { enrolledAt: 'DESC' },
    });
  }

  async getClassEnrollments(
    classId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginationResponseDto<ClassEnrollment>> {
    await this.getClassOrThrow(classId);

    const [enrollments, total] = await this.enrollmentRepo.findAndCount({
      where: { churchClass: { id: classId } },
      relations: ['member'],
      skip: (page - 1) * limit,
      take: limit,
      order: { enrolledAt: 'DESC' },
    });

    return UtilityService.createPaginationResponse(enrollments, page, limit, total);
  }

  private async getClassOrThrow(id: string): Promise<ChurchClass> {
    const churchClass = await this.classRepo.findOne({ where: { id } });
    if (!churchClass) throw new NotFoundException('Class not found');
    return churchClass;
  }

  private async getEnrollmentOrThrow(id: string): Promise<ClassEnrollment> {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }
}
