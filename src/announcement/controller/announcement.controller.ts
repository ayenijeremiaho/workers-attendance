import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnnouncementService } from '../service/announcement.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from '../dto/create-announcement.dto';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { CurrentUser } from '../../auth/decorator/current-user.decorator';
import { MemberAuth } from '../../auth/interface/auth.interface';

@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Post()
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: MemberAuth) {
    return this.announcementService.create(dto, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.announcementService.delete(id);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get('all')
  findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.announcementService.getAll(Number(page), Number(limit));
  }

  @Get('feed')
  getFeed(
    @CurrentUser() user: MemberAuth,
    @Query('departmentId') departmentId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.announcementService.getForMember(
      user.id,
      user.role,
      departmentId ?? null,
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.announcementService.getById(id);
  }
}
