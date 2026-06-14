import {Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,} from '@nestjs/common';
import {ClassesService} from '../service/classes.service';
import {CreateChurchClassDto, UpdateChurchClassDto} from '../dto/create-church-class.dto';
import {EnrollMemberDto, UpdateEnrollmentStatusDto} from '../dto/enroll-member.dto';
import {ChurchClassTypeEnum} from '../enum/church-class-type.enum';
import {JwtAuthGuard} from '../../auth/guard/jwt-auth.guard';
import {MemberAuth} from '../../auth/interface/auth.interface';
import {CurrentUser} from '../../auth/decorator/current-user.decorator';
import {AdminGuard} from '../../admin/guard/admin.guard';
import {RequiresPermission} from '../../admin/decorator/requires-permission.decorator';
import {AdminPermission} from '../../admin/enum/admin-permission.enum';

@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassesController {
    constructor(private readonly classesService: ClassesService) {
    }

    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.CLASSES_WRITE)
    @Post()
    create(@Body() dto: CreateChurchClassDto) {
        return this.classesService.createClass(dto);
    }

    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.CLASSES_WRITE)
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateChurchClassDto,
    ) {
        return this.classesService.updateClass(id, dto);
    }

    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.CLASSES_WRITE)
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.classesService.deleteClass(id);
    }

    @Get()
    findAll(
        @Query('type') type?: ChurchClassTypeEnum,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        return this.classesService.getAllClasses(type, Number(page), Number(limit));
    }

    @Get('my/enrollments')
    getMyEnrollments(@CurrentUser() user: MemberAuth) {
        return this.classesService.getMyEnrollments(user.id);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.classesService.getClass(id);
    }

    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.CLASSES_WRITE)
    @Post('enroll')
    enroll(@Body() dto: EnrollMemberDto) {
        return this.classesService.enrollMember(dto);
    }

    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.CLASSES_WRITE)
    @Patch('enrollments/:enrollmentId/status')
    updateEnrollmentStatus(
        @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
        @Body() dto: UpdateEnrollmentStatusDto,
    ) {
        return this.classesService.updateEnrollmentStatus(enrollmentId, dto.status);
    }

    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.CLASSES_READ)
    @Get(':id/enrollments')
    getClassEnrollments(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        return this.classesService.getClassEnrollments(id, Number(page), Number(limit));
    }
}
