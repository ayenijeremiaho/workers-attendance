import {
  Body,
  Controller,
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
import { MemberService } from '../service/member.service';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { MemberRoleEnum } from '../enums/member-role.enum';
import { MemberStatusEnum } from '../enums/member-status.enum';
import { WorkerStatusEnum } from '../enums/worker-status.enum';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { PromoteToWorkerDto } from '../dto/promote-to-worker.dto';
import { UpdateWorkerProfileDto } from '../dto/update-worker-profile.dto';
import { plainToInstance } from 'class-transformer';
import { MemberDto } from '../dto/member.dto';
import { WorkerProfileDto } from '../dto/worker-profile.dto';
import { UtilityService } from '../../utility/service/utility.service';

@Controller('members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Post('/admins')
  async createAdmin(@Body() dto: CreateAdminDto): Promise<MemberDto> {
    const member = await this.memberService.createAdmin(dto);
    return plainToInstance(MemberDto, member, { excludeExtraneousValues: true });
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get()
  async getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('role') role?: MemberRoleEnum,
  ) {
    const result = await this.memberService.getAll(+page, +limit, role);
    return UtilityService.getPaginationResponseDto(result, MemberDto);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get('/workers')
  async getWorkers(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: WorkerStatusEnum,
  ) {
    const result = await this.memberService.getWorkers(+page, +limit, status);
    return UtilityService.getPaginationResponseDto(result, MemberDto);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get(':id')
  async getOne(@Param('id', ParseUUIDPipe) id: string): Promise<MemberDto> {
    const member = await this.memberService.getById(id, [
      'workerProfile',
      'workerProfile.department',
    ]);
    return plainToInstance(MemberDto, member, { excludeExtraneousValues: true });
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Patch(':id')
  async updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberDto,
  ): Promise<MemberDto> {
    const member = await this.memberService.updateMember(id, dto);
    return plainToInstance(MemberDto, member, { excludeExtraneousValues: true });
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Post(':id/promote')
  async promoteToWorker(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PromoteToWorkerDto,
  ): Promise<MemberDto> {
    const member = await this.memberService.promoteToWorker(id, dto);
    return plainToInstance(MemberDto, member, { excludeExtraneousValues: true });
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Post(':id/revoke-worker')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeWorker(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.memberService.revokeWorker(id);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Patch(':id/worker-profile')
  async updateWorkerProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkerProfileDto,
  ): Promise<WorkerProfileDto> {
    const profile = await this.memberService.updateWorkerProfile(id, dto);
    return plainToInstance(WorkerProfileDto, profile, { excludeExtraneousValues: true });
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Patch(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: MemberStatusEnum,
  ): Promise<void> {
    await this.memberService.changeStatus(id, status);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Post(':id/reset-password')
  async resetPassword(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    const message = await this.memberService.resetPassword(id);
    return { message };
  }
}
