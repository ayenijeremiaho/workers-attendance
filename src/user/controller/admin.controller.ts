import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from '../service/admin.service';
import { Public } from '../../auth/decorator/public.decorator';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { plainToInstance } from 'class-transformer';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserType } from '../enums/user-type';
import { AdminDto } from '../dto/admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { PaginationResponseDto } from '../../utility/dto/PaginationResponseDto';
import { UtilityService } from '../../utility/utility.service';
import { Admin } from '../entity/admin.entity';

@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Post()
  async create(@Body() createAdminDto: CreateAdminDto): Promise<string> {
    console.log('creating admin');
    return await this.adminService.create(createAdminDto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Put('/:id')
  async update(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ): Promise<AdminDto> {
    const admin = await this.adminService.update(id, updateAdminDto);
    return plainToInstance(AdminDto, admin);
  }

  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Get('/:id')
  async get(@Param('id') id: string): Promise<AdminDto> {
    const admin = await this.adminService.get(id);
    return plainToInstance(AdminDto, admin);
  }

  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginationResponseDto<AdminDto>> {
    const paginatedAdmins = await this.adminService.getAll(page, limit);
    return UtilityService.getPaginationResponseDto<Admin, AdminDto>(
      paginatedAdmins,
      AdminDto,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Post('reset-password/:id')
  async resetPassword(@Param('id') id: string): Promise<string> {
    return await this.adminService.resetPassword(id);
  }
}
