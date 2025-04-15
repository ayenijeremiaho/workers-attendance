import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { UtilityService } from '../../utility/service/utility.service';
import { DepartmentDto } from '../dto/department.dto';
import { plainToInstance } from 'class-transformer';
import { AssignDepartmentHodDto } from '../dto/assign-department-hod.dto';
import { RemoveDepartmentHodDto } from '../dto/remove-department-hod.dto';
import { DepartmentHodsDto } from '../dto/department-hods.dto';

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
      DepartmentDto,
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

  @HttpCode(HttpStatus.OK)
  @Post('/assign-hod')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  async assignHOD(
    @Body() request: AssignDepartmentHodDto,
  ): Promise<DepartmentDto> {
    const department = await this.departmentService.assignHod(request);
    return plainToInstance(DepartmentDto, department);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/remove-hod')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  async removeHOD(
    @Body() request: RemoveDepartmentHodDto,
  ): Promise<DepartmentDto> {
    const department = await this.departmentService.removeHod(request);
    return plainToInstance(DepartmentDto, department);
  }

  @Get('/hods/:id')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  async getHODs(@Param('id') id: string): Promise<DepartmentHodsDto> {
    const hods = await this.departmentService.getDepartmentHods(id);
    return plainToInstance(DepartmentHodsDto, hods);
  }
}
