import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { Member } from '../entity/member.entity';
import { WorkerProfile } from '../entity/worker-profile.entity';
import { Department } from '../../department/entity/department.entity';
import { DepartmentLead } from '../../department/entity/department-lead.entity';
import { SundaySchoolClass } from '../../sunday-school/entity/sunday-school-class.entity';
import { UtilityService } from '../../utility/service/utility.service';
import { MemberRoleEnum } from '../enums/member-role.enum';
import { MemberStatusEnum } from '../enums/member-status.enum';
import { WorkerStatusEnum } from '../enums/worker-status.enum';
import { SignupDto } from '../dto/signup.dto';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { PromoteToWorkerDto } from '../dto/promote-to-worker.dto';
import { UpdateWorkerProfileDto } from '../dto/update-worker-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(WorkerProfile)
    private readonly workerProfileRepository: Repository<WorkerProfile>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(DepartmentLead)
    private readonly departmentLeadRepository: Repository<DepartmentLead>,
    @InjectRepository(SundaySchoolClass)
    private readonly sundaySchoolClassRepository: Repository<SundaySchoolClass>,
    private readonly utilityService: UtilityService,
  ) {}

  async signup(dto: SignupDto): Promise<Member> {
    await this.assertEmailUnique(dto.email);

    const password = await UtilityService.hashValue(dto.password);

    const member = this.memberRepository.create({
      firstname: dto.firstname,
      lastname: dto.lastname,
      email: dto.email,
      password,
      phoneNumber: dto.phoneNumber,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth,
      maritalStatus: dto.maritalStatus,
      yearBornAgain: dto.yearBornAgain ? new Date(`${dto.yearBornAgain}-01-01`) : null,
      yearBaptized: dto.yearBaptized ? new Date(`${dto.yearBaptized}-01-01`) : null,
      baptizedWithHolyGhost: dto.baptizedWithHolyGhost ?? false,
      yearJoinedChurch: dto.yearJoinedChurch ? new Date(`${dto.yearJoinedChurch}-01-01`) : null,
      role: MemberRoleEnum.MEMBER,
      status: MemberStatusEnum.ACTIVE,
      changedPassword: true,
    });

    const saved = await this.memberRepository.save(member);
    this.logger.log(`Member signed up: ${saved.email}`);

    const firstName = UtilityService.capitalizeFirstLetter(saved.firstname);
    this.utilityService.sendEmailWithTemplate(
      saved.email,
      `${firstName}, Welcome to Discovery Hub`,
      'welcome-member',
      { name: firstName, email: saved.email, login_url: process.env.LOGIN_URL },
    );

    return saved;
  }

  async createAdmin(dto: CreateAdminDto): Promise<Member> {
    await this.assertEmailUnique(dto.email);

    const plainPassword = UtilityService.generateRandomPassword();
    const password = await UtilityService.hashValue(plainPassword);

    const admin = this.memberRepository.create({
      firstname: dto.firstname,
      lastname: dto.lastname,
      email: dto.email,
      password,
      phoneNumber: dto.phoneNumber,
      role: MemberRoleEnum.ADMIN,
      status: MemberStatusEnum.ACTIVE,
      changedPassword: false,
    });

    const saved = await this.memberRepository.save(admin);
    this.logger.log(`Admin created: ${saved.email}`);

    const firstName = UtilityService.capitalizeFirstLetter(saved.firstname);
    this.utilityService.sendEmailWithTemplate(
      saved.email,
      `${firstName}, Your Discovery Hub Admin Account is Ready`,
      'welcome-admin',
      { name: firstName, email: saved.email, password: plainPassword, login_url: process.env.LOGIN_URL },
    );

    return saved;
  }

  async promoteToWorker(memberId: string, dto: PromoteToWorkerDto): Promise<Member> {
    const member = await this.getById(memberId, ['workerProfile']);

    if (member.workerProfile) {
      throw new BadRequestException('Member is already a worker');
    }

    const department = await this.departmentRepository.findOneBy({ id: dto.departmentId });
    if (!department) throw new NotFoundException('Department not found');

    const profile = this.workerProfileRepository.create({
      member,
      department,
      status: WorkerStatusEnum.ACTIVE,
      profession: dto.profession,
      yearJoinedWorkforce: dto.yearJoinedWorkforce
        ? new Date(`${dto.yearJoinedWorkforce}-01-01`)
        : null,
    });

    await this.workerProfileRepository.save(profile);
    member.role = MemberRoleEnum.WORKER;
    await this.memberRepository.save(member);

    this.logger.log(`Member ${member.email} promoted to worker`);

    const firstName = UtilityService.capitalizeFirstLetter(member.firstname);
    this.utilityService.sendEmailWithTemplate(
      member.email,
      `${firstName}, Welcome to Discovery Hub Workforce`,
      'welcome-worker',
      {
        name: `${firstName} ${member.lastname[0].toUpperCase()}.`,
        login_url: process.env.LOGIN_URL,
        username: member.email,
        explainer_video_android_url: process.env.EXPLAINER_VIDEO_ANDROID_URL,
        explainer_video_ios_url: process.env.EXPLAINER_VIDEO_IOS_URL,
        support_form_url: process.env.SUPPORT_FORM_URL,
      },
    );

    return this.getById(memberId, ['workerProfile', 'workerProfile.department']);
  }

  async revokeWorker(memberId: string): Promise<void> {
    const member = await this.getById(memberId, ['workerProfile']);
    if (!member.workerProfile) throw new BadRequestException('Member is not a worker');

    const profileId = member.workerProfile.id;

    // Use transaction to ensure all revocation steps complete atomically
    await this.memberRepository.manager.transaction(async (transactionalEntityManager) => {
      // Remove department lead roles — no cascade on this FK, so must be done explicitly.
      await transactionalEntityManager.delete(DepartmentLead, { workerProfile: { id: profileId } });

      // Null out any SS class teacher assignments so the revoked worker
      // is no longer listed as teacher on classes they can no longer access.
      await transactionalEntityManager.update(
        SundaySchoolClass,
        { teacher: { id: member.id } },
        { teacher: null },
      );

      // Remove worker profile
      await transactionalEntityManager.remove(member.workerProfile);

      // Update member role to MEMBER
      member.role = MemberRoleEnum.MEMBER;
      await transactionalEntityManager.save(member);
    });

    this.logger.log(`Worker role revoked for member: ${member.email}`);

    const firstName = UtilityService.capitalizeFirstLetter(member.firstname);
    this.utilityService.sendEmailWithTemplate(
      member.email,
      `${firstName}, Your Discovery Hub Role Has Been Updated`,
      'worker-revoked',
      { name: firstName },
    );
  }

  async updateMember(id: string, dto: UpdateMemberDto): Promise<Member> {
    const member = await this.getById(id);

    if (dto.email && dto.email !== member.email) {
      await this.assertEmailUnique(dto.email);
      member.email = dto.email;
    }

    if (dto.firstname) member.firstname = dto.firstname;
    if (dto.lastname) member.lastname = dto.lastname;
    if (dto.phoneNumber) member.phoneNumber = dto.phoneNumber;
    if (dto.gender) member.gender = dto.gender;
    if (dto.dateOfBirth) member.dateOfBirth = dto.dateOfBirth;
    if (dto.maritalStatus) member.maritalStatus = dto.maritalStatus;
    if (dto.yearBornAgain) member.yearBornAgain = new Date(`${dto.yearBornAgain}-01-01`);
    if (dto.yearBaptized) member.yearBaptized = new Date(`${dto.yearBaptized}-01-01`);
    if (dto.baptizedWithHolyGhost !== undefined) member.baptizedWithHolyGhost = dto.baptizedWithHolyGhost;
    if (dto.yearJoinedChurch) member.yearJoinedChurch = new Date(`${dto.yearJoinedChurch}-01-01`);

    return this.memberRepository.save(member);
  }

  async updateWorkerProfile(memberId: string, dto: UpdateWorkerProfileDto): Promise<WorkerProfile> {
    const member = await this.getById(memberId, [
      'workerProfile',
      'workerProfile.department',
      'workerProfile.secondaryDepartment',
    ]);
    if (!member.workerProfile) throw new BadRequestException('Member has no worker profile');

    const profile = member.workerProfile;

    if (dto.departmentId && dto.departmentId !== profile.department?.id) {
      profile.department = await this.resolveDepartment(dto.departmentId, 'Department not found');
    }

    if ('secondaryDepartmentId' in dto) {
      profile.secondaryDepartment = await this.resolveSecondaryDepartment(
        dto.secondaryDepartmentId,
        profile.secondaryDepartment,
      );
    }

    if (dto.status) profile.status = dto.status;
    if (dto.profession) profile.profession = dto.profession;
    if (dto.yearJoinedWorkforce) profile.yearJoinedWorkforce = new Date(`${dto.yearJoinedWorkforce}-01-01`);
    if (dto.completedSOD !== undefined) profile.completedSOD = dto.completedSOD;
    if (dto.completedBibleCollege !== undefined) profile.completedBibleCollege = dto.completedBibleCollege;

    return this.workerProfileRepository.save(profile);
  }

  private async resolveDepartment(id: string, notFoundMsg: string) {
    const dept = await this.departmentRepository.findOneBy({ id });
    if (!dept) throw new NotFoundException(notFoundMsg);
    return dept;
  }

  private async resolveSecondaryDepartment(
    incomingId: string | null | undefined,
    current: Department | null,
  ) {
    if (incomingId === null) return null;
    if (incomingId && incomingId !== current?.id) {
      return this.resolveDepartment(incomingId, 'Secondary department not found');
    }
    return current; // unchanged
  }

  async changeStatus(memberId: string, status: MemberStatusEnum): Promise<void> {
    const member = await this.getById(memberId);
    if (member.status === status) {
      throw new BadRequestException(`Member status is already ${status}`);
    }
    member.status = status;
    await this.memberRepository.save(member);

    const firstName = UtilityService.capitalizeFirstLetter(member.firstname);
    if (status === MemberStatusEnum.INACTIVE) {
      this.utilityService.sendEmailWithTemplate(
        member.email,
        `${firstName}, Your Discovery Hub Account Has Been Deactivated`,
        'account-deactivated',
        { name: firstName },
      );
    } else if (status === MemberStatusEnum.ACTIVE) {
      this.utilityService.sendEmailWithTemplate(
        member.email,
        `${firstName}, Your Discovery Hub Account Has Been Reactivated`,
        'account-reactivated',
        { name: firstName, login_url: process.env.LOGIN_URL },
      );
    }
  }

  async resetPassword(memberId: string): Promise<string> {
    const member = await this.getById(memberId);
    const newPassword = UtilityService.generateRandomPassword();
    member.password = await UtilityService.hashValue(newPassword);
    member.changedPassword = false;
    await this.memberRepository.save(member);

    const firstName = UtilityService.capitalizeFirstLetter(member.firstname);
    this.utilityService.sendEmailWithTemplate(
      member.email,
      `${firstName}, Your Discovery Hub Password Has Been Reset`,
      'password-reset',
      { name: firstName, newPassword, login_url: process.env.LOGIN_URL },
    );

    return 'Password reset successfully';
  }

  async changePassword(memberId: string, dto: ChangePasswordDto): Promise<string> {
    const member = await this.getById(memberId);

    const isValid = await UtilityService.verifyHashedValue(dto.oldPassword, member.password);
    if (!isValid) throw new BadRequestException('Old password is incorrect');

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }

    member.password = await UtilityService.hashValue(dto.newPassword);
    member.changedPassword = true;
    await this.memberRepository.save(member);

    const firstName = UtilityService.capitalizeFirstLetter(member.firstname);
    this.utilityService.sendEmailWithTemplate(
      member.email,
      `${firstName}, Your Discovery Hub Password Has Been Changed`,
      'password-changed',
      { name: firstName, login_url: process.env.LOGIN_URL },
    );

    return 'Password changed successfully';
  }

  async setPassword(memberId: string, newPassword: string, changedPassword: boolean): Promise<void> {
    const member = await this.getById(memberId);
    member.password = await UtilityService.hashValue(newPassword);
    member.changedPassword = changedPassword;
    await this.memberRepository.save(member);
  }

async getById(id: string, relations: string[] = []): Promise<Member> {
    const member = await this.memberRepository.findOne({ where: { id }, relations });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async findByEmail(email: string): Promise<Member | null> {
    return this.memberRepository.findOne({
      where: { email },
      relations: ['workerProfile', 'workerProfile.department'],
    });
  }

  async getAll(
    page = 1,
    limit = 10,
    role?: MemberRoleEnum,
  ): Promise<PaginationResponseDto<Member>> {
    if (page < 1) throw new BadRequestException('Page must be greater than 0');

    const where: any = {};
    if (role) where.role = role;

    const [members, total] = await this.memberRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['workerProfile', 'workerProfile.department'],
    });

    return UtilityService.createPaginationResponse(members, page, limit, total);
  }

  async getWorkers(
    page = 1,
    limit = 10,
    status?: WorkerStatusEnum,
  ): Promise<PaginationResponseDto<Member>> {
    if (page < 1) throw new BadRequestException('Page must be greater than 0');

    const qb = this.memberRepository
      .createQueryBuilder('member')
      .innerJoinAndSelect('member.workerProfile', 'profile')
      .innerJoinAndSelect('profile.department', 'department')
      .where('member.role = :role', { role: MemberRoleEnum.WORKER });

    if (status) {
      qb.andWhere('profile.status = :status', { status });
    }

    const [members, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('member.createdAt', 'DESC')
      .getManyAndCount();

    return UtilityService.createPaginationResponse(members, page, limit, total);
  }

  async getMembersNotCheckedInForSlot(slotId: string): Promise<Member[]> {
    return this.memberRepository
      .createQueryBuilder('member')
      .leftJoin(
        'attendances',
        'attendance',
        'attendance.member_id = member.id AND attendance.service_slot_id = :slotId',
        { slotId },
      )
      .where('attendance.id IS NULL')
      .andWhere('member.status = :status', { status: MemberStatusEnum.ACTIVE })
      .andWhere('member.role = :role', { role: MemberRoleEnum.MEMBER })
      .getMany();
  }

  async getWorkersNotCheckedInForSlot(slotId: string): Promise<Member[]> {
    return this.memberRepository
      .createQueryBuilder('member')
      .innerJoin('member.workerProfile', 'profile')
      .leftJoin(
        'attendances',
        'attendance',
        'attendance.member_id = member.id AND attendance.service_slot_id = :slotId',
        { slotId },
      )
      .where('attendance.id IS NULL')
      .andWhere('member.role = :role', { role: MemberRoleEnum.WORKER })
      .andWhere('profile.status = :status', { status: WorkerStatusEnum.ACTIVE })
      .getMany();
  }

  async count(options?: FindManyOptions<Member>): Promise<number> {
    return this.memberRepository.count(options);
  }

  private async assertEmailUnique(email: string): Promise<void> {
    const exists = await this.memberRepository.exists({ where: { email } });
    if (exists) throw new ConflictException('Email address is already registered');
  }
}
