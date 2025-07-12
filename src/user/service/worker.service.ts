import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UtilityService } from '../../utility/service/utility.service';
import { CreateWorkerDto } from '../dto/create-worker.dto';
import { Worker } from '../entity/worker.entity';
import { Department } from '../../department/entity/department.entity';
import { UpdateWorkerDto } from '../dto/update-worker.dto';
import { UserChangePasswordDto } from '../dto/user-change-password.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { WorkerStatusEnum } from '../enums/worker-status.enum';
import { FindManyOptions } from 'typeorm/find-options/FindManyOptions';

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly utilityService: UtilityService,
  ) {}

  async create(createWorkerDto: CreateWorkerDto): Promise<Worker> {
    const alreadyExist = await this.alreadyExist(createWorkerDto.email);

    if (alreadyExist) {
      this.logger.error(
        `Worker with the provided email ${createWorkerDto.email} already exist`,
      );
      throw new BadRequestException(
        'Worker with the provided email already exist',
      );
    }

    const department = await this.departmentRepository.findOneBy({
      id: createWorkerDto.departmentId,
    });

    if (!department) {
      this.logger.error('Department not found');
      throw new NotFoundException('Department not found');
    }

    const unEncryptedPassword = `${createWorkerDto.lastname}`;
    const password = await UtilityService.hashValue(unEncryptedPassword);

    const yearBaptized = createWorkerDto.yearBaptized;
    const yearBornAgain = createWorkerDto.yearBornAgain;
    const yearJoinedWorkforce = createWorkerDto.yearJoinedWorkforce;
    const yearJoinedChurch = createWorkerDto.yearJoinedChurch;
    const createWorker = {
      ...createWorkerDto,
      department: department,
      password: `${password}`,
      yearBaptized: yearBaptized ? new Date(yearBaptized) : null,
      yearBornAgain: yearBaptized ? new Date(yearBornAgain) : null,
      yearJoinedWorkforce: yearJoinedWorkforce
        ? new Date(yearJoinedWorkforce)
        : null,
      yearJoinedChurch: yearJoinedChurch ? new Date(yearJoinedChurch) : null,
    };

    const worker = await this.workerRepository.save(createWorker);

    this.logger.log('worker created successfully');

    const capitalizeFirstLetter = UtilityService.capitalizeFirstLetter(
      worker.firstname,
    );
    this.utilityService.sendEmailWithTemplate(
      worker.email,
      `${capitalizeFirstLetter}, Welcome to RCCG DC Staff App`,
      'welcome-worker',
      {
        login_url: process.env.LOGIN_URL,
        username: worker.email,
        password: unEncryptedPassword,
        name: `${capitalizeFirstLetter} ${worker.lastname[0].toUpperCase()}.`,
        explainer_video_android_url: process.env.EXPLAINER_VIDEO_ANDROID_URL,
        explainer_video_ios_url: process.env.EXPLAINER_VIDEO_IOS_URL,
        support_form_url: process.env.SUPPORT_FORM_URL,
      },
    );

    return worker;
  }

  async update(id: string, updateWorkerDto: UpdateWorkerDto): Promise<Worker> {
    let worker = await this.get(id, true);
    await this.verifyIfEmailUpdate(worker, updateWorkerDto.email);
    await this.verifyIfDepartmentUpdate(worker, updateWorkerDto.departmentId);

    if (updateWorkerDto.lastname) {
      worker.lastname = updateWorkerDto.lastname;
    }

    if (updateWorkerDto.firstname) {
      worker.firstname = updateWorkerDto.firstname;
    }

    if (updateWorkerDto.phoneNumber) {
      worker.phoneNumber = updateWorkerDto.phoneNumber;
    }

    if (updateWorkerDto.gender) {
      worker.gender = updateWorkerDto.gender;
    }

    if (updateWorkerDto.yearBaptized) {
      worker.yearBaptized = new Date(updateWorkerDto.yearBaptized);
    }

    if (updateWorkerDto.yearBornAgain) {
      worker.yearBornAgain = new Date(updateWorkerDto.yearBornAgain);
    }

    if (updateWorkerDto.yearJoinedWorkforce) {
      worker.yearJoinedWorkforce = new Date(
        updateWorkerDto.yearJoinedWorkforce,
      );
    }

    if (updateWorkerDto.yearJoinedChurch) {
      worker.yearJoinedChurch = new Date(updateWorkerDto.yearJoinedChurch);
    }

    if (updateWorkerDto.dateOfBirth) {
      worker.dateOfBirth = updateWorkerDto.dateOfBirth;
    }

    worker = await this.workerRepository.save(worker);

    this.utilityService.sendEmail(
      worker.email,
      `${UtilityService.capitalizeFirstLetter(worker.firstname)} Account Updated`,
      `Your account has been updated successfully`,
    );

    return worker;
  }

  async changeStatus(id: string, status: WorkerStatusEnum) {
    const worker = await this.get(id);

    if (status === worker.status) {
      throw new BadRequestException(`Worker status is already ${status}`);
    }

    worker.status = status;
    await this.workerRepository.save(worker);

    this.utilityService.sendEmail(
      worker.email,
      `${UtilityService.capitalizeFirstLetter(worker.firstname)} Account Status Changed`,
      `Your account status has been changed to ${status}`,
    );

    return worker;
  }

  async get(id: string, fullDetails: boolean = false): Promise<Worker> {
    const worker = fullDetails
      ? await this.workerRepository.findOne({
          where: { id },
          relations: ['department'],
        })
      : await this.workerRepository.findOneBy({ id });

    if (!worker) {
      throw new NotFoundException('Worker not found');
    } else {
      return worker;
    }
  }

  async getAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResponseDto<Worker>> {
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    const [workers, total] = await this.workerRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['department'],
    });

    return UtilityService.createPaginationResponse<Worker>(
      workers,
      page,
      limit,
      total,
    );
  }

  async resetPassword(id: string): Promise<string> {
    const worker = await this.get(id);

    const newPassword = UtilityService.generateRandomPassword();
    worker.password = await UtilityService.hashValue(newPassword);
    worker.changedPassword = false;
    await this.workerRepository.save(worker);

    this.utilityService.sendEmail(
      worker.email,
      `${UtilityService.capitalizeFirstLetter(worker.firstname)} Password Reset`,
      `Your password has been reset. Your new password is ${newPassword}`,
    );

    this.logger.log(`Password reset for worker with email ${worker.email}`);
    return 'Password reset successfully';
  }

  async changePassword(
    id: string,
    changePasswordDto: UserChangePasswordDto,
  ): Promise<string> {
    const worker = await this.get(id);

    const isOldPasswordValid = await UtilityService.verifyHashedValue(
      changePasswordDto.oldPassword,
      worker.password,
    );

    if (!isOldPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }

    worker.changedPassword = true;
    worker.password = await UtilityService.hashValue(
      changePasswordDto.newPassword,
    );
    await this.workerRepository.save(worker);

    this.utilityService.sendEmail(
      worker.email,
      `${UtilityService.capitalizeFirstLetter(worker.firstname)} Password Changed`,
      `Your password has been changed successfully.`,
    );

    this.logger.log(`Password changed for worker with email ${worker.email}`);
    return 'Password changed successfully';
  }

  async getWorkersNotCheckedInForEvent(eventId: string): Promise<Worker[]> {
    return this.workerRepository
      .createQueryBuilder('worker')
      .leftJoin(
        'attendances',
        'attendance',
        'attendance.worker_id = worker.id AND attendance.event_id = :eventId',
        { eventId },
      )
      .where('attendance.id IS NULL')
      .getMany();
  }

  async getWorkersCountByStatus(): Promise<any[]> {
    const statuses = Object.values(WorkerStatusEnum);

    const queryBuilder = this.workerRepository
      .createQueryBuilder('worker')
      .select('worker.status', 'status')
      .addSelect('COUNT(worker.id)', 'count')
      .groupBy('worker.status')
      .orderBy('worker.status', 'ASC');

    const result = await queryBuilder.getRawMany();

    const statusCountMap = result.reduce((acc, { status, count }) => {
      acc[status] = parseInt(count, 10);
      return acc;
    }, {});

    return statuses.map((status) => ({
      status,
      count: statusCountMap[status] || 0,
    }));
  }

  async count(
    options?: FindManyOptions<Worker>,
    where?: FindManyOptions<Worker>['where'],
  ): Promise<number> {
    return this.workerRepository.count({
      ...options,
      where: { ...options?.where, ...where }, // Merge conditions dynamically
    });
  }

  async resendWelcomeEmail(email: string): Promise<string> {
    const worker = await this.findByEmail(email);
    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    this.utilityService.sendEmailWithTemplate(
      worker.email,
      `${UtilityService.capitalizeFirstLetter(worker.firstname)}, Welcome to RCCG DC Staff App`,
      'welcome-worker',
      {
        login_url: process.env.LOGIN_URL,
        username: worker.email,
        password: `&lt;check previous email for password&gt;`,
        name: `${UtilityService.capitalizeFirstLetter(worker.firstname)} ${worker.lastname[0].toUpperCase()}.`,
        explainer_video_android_url: process.env.EXPLAINER_VIDEO_ANDROID_URL,
        explainer_video_ios_url: process.env.EXPLAINER_VIDEO_IOS_URL,
        support_form_url: process.env.SUPPORT_FORM_URL,
      },
    );

    return 'Welcome email resent successfully';
  }

  private async verifyIfDepartmentUpdate(
    worker: Worker,
    newDepartmentId: string,
  ) {
    if (newDepartmentId && newDepartmentId != worker.department.id) {
      const department = await this.departmentRepository.findOneBy({
        id: newDepartmentId,
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }

      worker.department = department;
    }
  }

  private async verifyIfEmailUpdate(worker: Worker, newEmail: string) {
    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    if (newEmail && newEmail != worker.email) {
      const alreadyExist = await this.alreadyExist(newEmail);

      if (alreadyExist) {
        throw new BadRequestException(
          'Worker with the provided email already exist',
        );
      }

      worker.email = newEmail;
    }
  }

  async findByEmail(email: string) {
    return await this.workerRepository.findOne({ where: { email } });
  }

  private async alreadyExist(email: string): Promise<boolean> {
    return this.workerRepository.exists({ where: { email: email } });
  }
}
