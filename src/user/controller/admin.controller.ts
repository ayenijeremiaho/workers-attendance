import { Body, Controller, Post } from '@nestjs/common';
import { AdminService } from '../service/admin.service';
import { Public } from '../../auth/decorator/public.decorator';
import { CreateAdminDto } from '../dto/create-admin.dto';

@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Post()
  async create(@Body() createAdminDto: CreateAdminDto): Promise<string> {
    console.log('creating admin');
    return await this.adminService.create(createAdminDto);
  }
}
