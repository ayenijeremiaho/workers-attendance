import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DepartmentService } from '../service/department.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { AssignDepartmentHodDto } from '../dto/assign-department-hod.dto';
import { RemoveDepartmentHodDto } from '../dto/remove-department-hod.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';

@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  async getAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.departmentService.getAll(+page, +limit);
  }

  @Get(':id')
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentService.getOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Post()
  async create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.departmentService.delete(id);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('assign-lead')
  async assignLead(@Body() dto: AssignDepartmentHodDto) {
    return this.departmentService.assignLead(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('remove-lead')
  async removeLead(@Body() dto: RemoveDepartmentHodDto) {
    return this.departmentService.removeLead(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get('leads/:id')
  async getDepartmentLeads(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentService.getDepartmentLeads(id);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get('leads')
  async getAllLeads() {
    return this.departmentService.getAllLeads();
  }
}
