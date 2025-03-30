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
import { CreateWorkerDto } from '../dto/create-worker.dto';
import { WorkerService } from '../service/worker.service';
import { plainToInstance } from 'class-transformer';
import { WorkerDto } from '../dto/worker.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserTypeEnum } from '../enums/user-type.enum';
import { UpdateWorkerDto } from '../dto/update-worker.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/utility.service';
import { Worker } from '../entity/worker.entity';

@UseGuards(RolesGuard)
@Roles(UserTypeEnum.ADMIN)
@Controller('workers')
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @Post()
  async create(@Body() createWorkerDto: CreateWorkerDto): Promise<WorkerDto> {
    const worker = await this.workerService.create(createWorkerDto);
    return plainToInstance(WorkerDto, worker);
  }

  @Put('/:id')
  async update(
    @Param('id') id: string,
    @Body() updateWorkerDto: UpdateWorkerDto,
  ): Promise<WorkerDto> {
    const worker = await this.workerService.update(id, updateWorkerDto);
    return plainToInstance(WorkerDto, worker);
  }

  @Get('/:id')
  async get(@Param('id') id: string): Promise<WorkerDto> {
    const worker = await this.workerService.get(id, true);
    return plainToInstance(WorkerDto, worker);
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginationResponseDto<WorkerDto>> {
    const workers = await this.workerService.getAll(page, limit);
    return UtilityService.getPaginationResponseDto<Worker, WorkerDto>(
      workers,
      WorkerDto,
    );
  }

  @Post('reset-password/:id')
  async resetPassword(@Param('id') id: string): Promise<string> {
    return await this.workerService.resetPassword(id);
  }
}
