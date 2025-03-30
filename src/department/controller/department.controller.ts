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
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserTypeEnum } from '../../user/enums/user-type.enum';
import { UtilityService } from '../../utility/utility.service';
import { DepartmentDto } from '../dto/department.dto';
import { plainToInstance } from 'class-transformer';

@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginationResponseDto<DepartmentDto>> {
    const departments = await this.departmentService.getAll(page, limit);
    return UtilityService.getPaginationResponseDto<Department, DepartmentDto>(
      departments,
      Department,
    );
  }

  @Get('/:id')
  async findOne(@Param('id') id: string): Promise<DepartmentDto> {
    const department = await this.departmentService.getOne(id);
    return plainToInstance(DepartmentDto, department);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  async create(@Body() request: CreateDepartmentDto): Promise<DepartmentDto> {
    const department = await this.departmentService.create(request);
    return plainToInstance(DepartmentDto, department);
  }

  @Put('/:id')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() request: UpdateDepartmentDto,
  ): Promise<DepartmentDto> {
    const department = await this.departmentService.update(id, request);
    return plainToInstance(DepartmentDto, department);
  }

  @Delete('/:id')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  async delete(@Param('id') id: string): Promise<void> {
    await this.departmentService.delete(id);
  }
}
