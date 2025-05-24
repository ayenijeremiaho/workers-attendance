import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UtilityService } from '../../utility/service/utility.service';
import { Admin } from '../entity/admin.entity';
import { UserChangePasswordDto } from '../dto/user-change-password.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { FindManyOptions } from 'typeorm/find-options/FindManyOptions';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly utilityService: UtilityService,
  ) {}

  async create(createAdminDto: CreateAdminDto): Promise<string> {
    const alreadyExist = await this.alreadyExist(createAdminDto.email);

    if (alreadyExist) {
      this.logger.error('Admin with the provided email already exist');
      throw new BadRequestException(
        'Admin with the provided email already exist',
      );
    }

    const unEncryptedPassword = `${createAdminDto.lastname}`;
    const password = await UtilityService.hashValue(unEncryptedPassword);

    const createAdmin = {
      ...createAdminDto,
      password: `${password}`,
    };

    const admin = await this.adminRepository.save(createAdmin);

    this.logger.log(`Admin ${admin.email} created successfully`);

    this.utilityService.sendEmail(
      admin.email,
      `${UtilityService.capitalizeFirstLetter(admin.firstname)} Account Created`,
      `Your account has been created successfully. Your password is ${unEncryptedPassword}`,
    );

    return 'success';
  }

  async update(id: string, updateAdminDto: UpdateAdminDto): Promise<Admin> {
    let admin = await this.get(id);

    await this.verifyIfEmailUpdate(admin, updateAdminDto.email);

    if (updateAdminDto.lastname) {
      admin.lastname = updateAdminDto.lastname;
    }

    if (updateAdminDto.firstname) {
      admin.firstname = updateAdminDto.firstname;
    }

    if (updateAdminDto.phoneNumber) {
      admin.phoneNumber = updateAdminDto.phoneNumber;
    }

    admin = await this.adminRepository.save(admin);

    this.utilityService.sendEmail(
      admin.email,
      `${UtilityService.capitalizeFirstLetter(admin.firstname)} Account Updated`,
      `Your admin account has been updated successfully`,
    );

    return admin;
  }

  async get(id: string): Promise<Admin> {
    const admin = await this.adminRepository.findOneBy({ id });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    } else {
      return admin;
    }
  }

  async getAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResponseDto<Admin>> {
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    const [admins, total] = await this.adminRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return UtilityService.createPaginationResponse<Admin>(
      admins,
      page,
      limit,
      total,
    );
  }

  async resetPassword(id: string): Promise<string> {
    const admin = await this.get(id);

    const newPassword = UtilityService.generateRandomPassword();
    admin.password = await UtilityService.hashValue(newPassword);
    admin.changedPassword = false;
    await this.adminRepository.save(admin);

    this.utilityService.sendEmail(
      admin.email,
      `${UtilityService.capitalizeFirstLetter(admin.firstname)} Password Reset`,
      `Your password has been reset. Your new password is ${newPassword}`,
    );

    this.logger.log(`Password reset for Admin with email ${admin.email}`);
    return 'Password reset successfully';
  }

  async findByEmail(email: string) {
    return await this.adminRepository.findOne({ where: { email } });
  }

  async changePassword(
    id: string,
    changePasswordDto: UserChangePasswordDto,
  ): Promise<string> {
    const admin = await this.get(id);

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const isOldPasswordValid = await UtilityService.verifyHashedValue(
      changePasswordDto.oldPassword,
      admin.password,
    );
    if (!isOldPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }

    admin.changedPassword = true;
    admin.password = await UtilityService.hashValue(
      changePasswordDto.newPassword,
    );
    await this.adminRepository.save(admin);

    this.utilityService.sendEmail(
      admin.email,
      `${UtilityService.capitalizeFirstLetter(admin.firstname)} Password Changed`,
      `Your password has been changed successfully.`,
    );

    this.logger.log(`Password changed for admin with email ${admin.email}`);
    return 'Password changed successfully';
  }

  async count(options?: FindManyOptions<Admin>): Promise<number> {
    return this.adminRepository.count(options);
  }

  private async verifyIfEmailUpdate(admin: Admin, newEmail: string) {
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (newEmail && newEmail != admin.email) {
      const alreadyExist = await this.alreadyExist(newEmail);

      if (alreadyExist) {
        throw new BadRequestException(
          'Admin with the provided email already exist',
        );
      }

      admin.email = newEmail;
    }
  }

  private async alreadyExist(email: string): Promise<boolean> {
    return this.adminRepository.exists({ where: { email: email } });
  }
}
