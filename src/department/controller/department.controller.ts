import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DepartmentService } from '../service/department.service';
import { Department } from '../entity/department.entity';
import { PaginationResponseDto } from '../../utility/dto/PaginationResponseDto';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserType } from '../../user/enums/user-type';

@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get('/all')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginationResponseDto<Department>> {
    return this.departmentService.getAll(page, limit);
  }

  @Get('/:id')
  async findOne(@Param('id') id: string): Promise<Department> {
    return this.departmentService.getOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async create(@Body() request: CreateDepartmentDto): Promise<Department> {
    return this.departmentService.create(request);
  }

  @Put('/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() request: UpdateDepartmentDto,
  ): Promise<Department> {
    return this.departmentService.update(id, request);
  }

  @Delete('/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async delete(@Param('id') id: string): Promise<void> {
    await this.departmentService.delete(id);
  }
}
