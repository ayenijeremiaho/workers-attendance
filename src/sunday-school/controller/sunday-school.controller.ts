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
    Request,
    UseGuards,
} from '@nestjs/common';
import {SundaySchoolService} from '../service/sunday-school.service';
import {RolesGuard} from '../../auth/guard/roles.guard';
import {Roles} from '../../auth/decorator/roles.decorator';
import {MemberRoleEnum} from '../../member/enums/member-role.enum';
import {CreateSundaySchoolClassDto, UpdateSundaySchoolClassDto} from '../dto/create-sunday-school-class.dto';
import {AssignSundaySchoolMemberDto} from '../dto/assign-sunday-school-member.dto';
import {CreateSundaySchoolSessionDto} from '../dto/create-sunday-school-session.dto';
import {BulkMarkAttendanceDto} from '../dto/bulk-mark-attendance.dto';
import {AdminGuard} from '../../admin/guard/admin.guard';
import {RequiresPermission} from '../../admin/decorator/requires-permission.decorator';
import {AdminPermission} from '../../admin/enum/admin-permission.enum';

@Controller('sunday-school')
export class SundaySchoolController {
    constructor(private readonly sundaySchoolService: SundaySchoolService) {
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Post('classes')
    async createClass(@Request() req: any, @Body() dto: CreateSundaySchoolClassDto) {
        return this.sundaySchoolService.createClass(req.user, dto);
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Patch('classes/:id')
    async updateClass(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateSundaySchoolClassDto,
    ) {
        return this.sundaySchoolService.updateClass(req.user, id, dto);
    }

    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.SUNDAY_SCHOOL_WRITE)
    @Delete('classes/:id')
    async deleteClass(@Param('id', ParseUUIDPipe) id: string) {
        return this.sundaySchoolService.deleteClass(id);
    }

    @Get('classes')
    async getAllClasses(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.sundaySchoolService.getAllClasses(+page, +limit);
    }

    @Get('classes/:id')
    async getClass(@Param('id', ParseUUIDPipe) id: string) {
        return this.sundaySchoolService.getClass(id);
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Post('classes/:id/members')
    async assignMember(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) classId: string,
        @Body() dto: AssignSundaySchoolMemberDto,
    ) {
        return this.sundaySchoolService.assignMember(req.user, classId, dto);
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Delete('classes/:id/members/:memberId')
    async removeMember(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) classId: string,
        @Param('memberId', ParseUUIDPipe) memberId: string,
    ) {
        return this.sundaySchoolService.removeMember(req.user, classId, memberId);
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Get('classes/:id/members')
    async getClassMembers(
        @Param('id', ParseUUIDPipe) classId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.sundaySchoolService.getClassMembers(classId, +page, +limit);
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Get('sessions')
    async getSessionsForClass(
        @Request() req: any,
        @Query('classId', ParseUUIDPipe) classId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.sundaySchoolService.getSessionsForClass(req.user, classId, +page, +limit);
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Get('sessions/:id')
    async getSession(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.sundaySchoolService.getSession(req.user, id);
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Delete('sessions/:id')
    async deleteSession(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.sundaySchoolService.deleteSession(req.user, id);
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Post('sessions')
    async createSession(@Request() req: any, @Body() dto: CreateSundaySchoolSessionDto) {
        return this.sundaySchoolService.createSession(req.user, dto);
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Patch('sessions/:id/toggle-self-mark')
    async toggleSelfMark(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.sundaySchoolService.toggleSelfMark(req.user, id);
    }

    @Post('sessions/:id/checkin')
    async selfMarkPresent(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.sundaySchoolService.selfMarkPresent(req.user, id);
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Post('sessions/:id/bulk-mark')
    async bulkMarkAttendance(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: BulkMarkAttendanceDto,
    ) {
        return this.sundaySchoolService.bulkMarkAttendance(req.user, id, dto);
    }

    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    @Get('sessions/:id/roster')
    async getSessionRoster(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.sundaySchoolService.getSessionRoster(req.user, id);
    }
}
