import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateWorkerDto } from '../dto/create-worker.dto';
import { WorkerService } from '../service/worker.service';
import { plainToClass } from 'class-transformer';
import { WorkerDto } from '../dto/worker.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserType } from '../enums/user-type';
import { UpdateWorkerDto } from '../dto/update-worker.dto';

@UseGuards(RolesGuard)
@Roles(UserType.ADMIN)
@Controller('workers')
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @Post()
  async create(@Body() createWorkerDto: CreateWorkerDto): Promise<WorkerDto> {
    const worker = await this.workerService.create(createWorkerDto);
    return plainToClass(WorkerDto, worker);
  }

  @Put('/:id')
  async update(
    @Param('id') id: string,
    @Body() updateWorkerDto: UpdateWorkerDto,
  ): Promise<WorkerDto> {
    const worker = await this.workerService.update(id, updateWorkerDto);
    return plainToClass(WorkerDto, worker);
  }

  @Get('/:id')
  async get(@Param('id') id: string): Promise<WorkerDto> {
    const worker = await this.workerService.get(id);
    return plainToClass(WorkerDto, worker);
  }

  @Post('reset-password/:id')
  async resetPassword(@Param('id') id: string): Promise<string> {
    return await this.workerService.resetPassword(id);
  }
}
