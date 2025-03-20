import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UtilityService } from '../../utility/utility.service';
import { Admin } from '../entity/admin.entity';
import { UserChangePasswordDto } from '../dto/user-change-password.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly utilityService: UtilityService,
  ) {}

  public async create(createAdminDto: CreateAdminDto): Promise<string> {
    const alreadyExist = await this.alreadyExist(createAdminDto.email);

    if (alreadyExist) {
      this.logger.error('Admin with the provided email already exist');
      throw new BadRequestException(
        'Admin with the provided email already exist',
      );
    }

    let password = `${createAdminDto.lastname}`;
    password = await this.utilityService.hashValue(password);

    const createAdmin = {
      ...createAdminDto,
      password: `${password}`,
    };

    await this.adminRepository.save(createAdmin);

    this.logger.log(`Admin ${createAdmin.email} created successfully`);

    return 'success';
  }

  public async getByEmail(email: string): Promise<Admin> {
    const admin = await this.findByEmail(email);

    if (!admin) {
      throw new NotFoundException(
        'Admin with the provided email does not exist',
      );
    } else {
      return admin;
    }
  }

  public async get(id: string): Promise<Admin> {
    return await this.adminRepository.findOneBy({ id });
  }

  public async update(id: string, data: Partial<Admin>) {
    return await this.adminRepository.update(id, data);
  }

  public async findByEmail(email: string) {
    return await this.adminRepository.findOne({ where: { email } });
  }

  public async changePassword(
    id: string,
    changePasswordDto: UserChangePasswordDto,
  ): Promise<string> {
    const admin = await this.get(id);

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const isOldPasswordValid = await this.utilityService.verifyHashedValue(
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
    admin.password = await this.utilityService.hashValue(
      changePasswordDto.newPassword,
    );
    await this.adminRepository.save(admin);

    this.utilityService.sendEmail(
      admin.email,
      'Password Changed',
      `Your password has been changed successfully.`,
    );

    this.logger.log(`Password changed for admin with email ${admin.email}`);
    return 'Password changed successfully';
  }

  private async alreadyExist(email: string): Promise<boolean> {
    return this.adminRepository.exists({ where: { email: email } });
  }
}
