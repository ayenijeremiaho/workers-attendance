import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminService } from '../service/admin.service';

@Injectable()
export class DefaultAdminSeed {
  private readonly logger = new Logger(DefaultAdminSeed.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  async seed() {
    const count = await this.adminService.count({});
    if (count === 0) {
      await this.adminService.create({
        firstname: this.configService.get<string>('DEFAULT_ADMIN_FIRSTNAME'),
        lastname: this.configService.get<string>('DEFAULT_ADMIN_LASTNAME'),
        email: this.configService.get<string>('DEFAULT_ADMIN_EMAIL'),
        phoneNumber: this.configService.get<string>(
          'DEFAULT_ADMIN_PHONE_NUMBER',
        ),
      });
      this.logger.log('Default admin created successfully');
    } else {
      this.logger.log('Admin already exist');
    }
  }
}
