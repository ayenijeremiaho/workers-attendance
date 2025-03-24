import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UtilityService } from '../../utility/utility.service';
import { CreateWorkerDto } from '../dto/create-worker.dto';
import { Worker } from '../entity/worker.entity';
import { Department } from '../../department/entity/department.entity';
import { UpdateWorkerDto } from '../dto/update-worker.dto';
import { UserChangePasswordDto } from '../dto/user-change-password.dto';
import { PaginationResponseDto } from '../../utility/dto/PaginationResponseDto';

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

  public async create(createWorkerDto: CreateWorkerDto): Promise<Worker> {
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

    const createWorker = {
      ...createWorkerDto,
      department: department,
      password: `${password}`,
    };

    const worker = await this.workerRepository.save(createWorker);

    this.logger.log('worker created successfully');

    this.utilityService.sendEmail(
      worker.email,
      `${UtilityService.capitalizeFirstLetter(worker.firstname)} Account Created`,
      `Your account has been created successfully. Your password is ${unEncryptedPassword}`,
    );

    return worker;
  }

  public async update(
    id: string,
    updateWorkerDto: UpdateWorkerDto,
  ): Promise<Worker> {
    let worker = await this.get(id);
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

    worker = await this.workerRepository.save(worker);

    this.utilityService.sendEmail(
      worker.email,
      `${UtilityService.capitalizeFirstLetter(worker.firstname)} Account Updated`,
      `Your account has been updated successfully`,
    );

    return worker;
  }

  public async get(id: string, fullDetails: boolean = false): Promise<Worker> {
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

  public async getAll(
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
    });

    return UtilityService.createPaginationResponse<Worker>(
      workers,
      page,
      limit,
      total,
    );
  }

  public async resetPassword(id: string): Promise<string> {
    const worker = await this.get(id);

    const newPassword = UtilityService.generateRandomPassword();
    worker.password = await UtilityService.hashValue(newPassword);
    worker.changedPassword = true;
    await this.workerRepository.save(worker);

    this.utilityService.sendEmail(
      worker.email,
      `${UtilityService.capitalizeFirstLetter(worker.firstname)} Password Reset`,
      `Your password has been reset. Your new password is ${newPassword}`,
    );

    this.logger.log(`Password reset for worker with email ${worker.email}`);
    return 'Password reset successfully';
  }

  public async changePassword(
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

  public async findByEmail(email: string) {
    return await this.workerRepository.findOne({ where: { email } });
  }

  private async alreadyExist(email: string): Promise<boolean> {
    return this.workerRepository.exists({ where: { email: email } });
  }
}
