import {Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, Res, UseGuards} from '@nestjs/common';
import {Response} from 'express';
import {RolesGuard} from '../../auth/guard/roles.guard';
import {Roles} from '../../auth/decorator/roles.decorator';
import {CurrentUser} from '../../auth/decorator/current-user.decorator';
import {MemberAuth} from '../../auth/interface/auth.interface';
import {MemberRoleEnum} from '../../member/enums/member-role.enum';
import {AdminGuard} from '../../admin/guard/admin.guard';
import {RequiresPermission} from '../../admin/decorator/requires-permission.decorator';
import {AdminPermission} from '../../admin/enum/admin-permission.enum';
import {ServiceSessionService} from '../service/service-session.service';
import {ServiceSessionGateway} from '../gateway/service-session.gateway';
import {PauseSessionDto} from '../dto/pause-session.dto';
import {RuntimeOverrideDto} from '../dto/runtime-override.dto';

@Controller('service-session')
export class ServiceSessionController {
    constructor(
        private readonly sessionSvc: ServiceSessionService,
        private readonly gateway: ServiceSessionGateway,
    ) {}

    @Post('programme/:programmeId/start')
    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    async start(@Param('programmeId', ParseUUIDPipe) programmeId: string, @CurrentUser() user: MemberAuth) {
        const session = await this.sessionSvc.start(programmeId, user.id);
        const state = await this.sessionSvc.getState(session.sessionCode);
        this.gateway.broadcastState(session.sessionCode, state.anchor, state.session);
        return session;
    }

    @Post(':sessionCode/advance')
    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    async advance(@Param('sessionCode') sessionCode: string, @CurrentUser() user: MemberAuth) {
        const anchor = await this.sessionSvc.advance(sessionCode, user.id);
        this.gateway.broadcastState(sessionCode, anchor, null);
        return anchor;
    }

    @Post(':sessionCode/rewind')
    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    async rewind(@Param('sessionCode') sessionCode: string, @CurrentUser() user: MemberAuth) {
        const anchor = await this.sessionSvc.rewind(sessionCode, user.id);
        this.gateway.broadcastState(sessionCode, anchor, null);
        return anchor;
    }

    @Post(':sessionCode/pause')
    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    async pause(@Param('sessionCode') sessionCode: string, @Body() dto: PauseSessionDto, @CurrentUser() user: MemberAuth) {
        const anchor = await this.sessionSvc.pause(sessionCode, dto, user.id);
        this.gateway.broadcastState(sessionCode, anchor, null);
        return anchor;
    }

    @Post(':sessionCode/resume')
    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    async resume(@Param('sessionCode') sessionCode: string, @CurrentUser() user: MemberAuth) {
        const anchor = await this.sessionSvc.resume(sessionCode, user.id);
        this.gateway.broadcastState(sessionCode, anchor, null);
        return anchor;
    }

    @Post(':sessionCode/slots/:position/override')
    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    async overrideSlot(
        @Param('sessionCode') sessionCode: string,
        @Param('position', ParseIntPipe) position: number,
        @Body() dto: RuntimeOverrideDto,
        @CurrentUser() user: MemberAuth,
    ) {
        const slot = await this.sessionSvc.overrideSlot(sessionCode, position, dto, user.id);
        const state = await this.sessionSvc.getState(sessionCode);
        this.gateway.broadcastState(sessionCode, state.anchor, state.session);
        return slot;
    }

    @Post(':sessionCode/end')
    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    async end(@Param('sessionCode') sessionCode: string, @CurrentUser() user: MemberAuth) {
        const session = await this.sessionSvc.end(sessionCode, user.id);
        const state = await this.sessionSvc.getState(sessionCode);
        this.gateway.broadcastState(sessionCode, state.anchor, state.session);
        return session;
    }

    @Get('analytics')
    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.SERVICE_PROGRAMME_READ)
    getAnalytics(
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('serviceSlotName') serviceSlotName?: string,
    ) {
        return this.sessionSvc.getAnalytics(from, to, serviceSlotName);
    }

    @Get(':sessionCode/state')
    getState(@Param('sessionCode') sessionCode: string) {
        return this.sessionSvc.getState(sessionCode);
    }

    @Get(':sessionCode/slots/:position')
    getSlotForSpeaker(
        @Param('sessionCode') sessionCode: string,
        @Param('position', ParseIntPipe) position: number,
    ) {
        return this.sessionSvc.getSlotForSpeaker(sessionCode, position);
    }

    @Get(':sessionCode/report')
    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.SERVICE_PROGRAMME_READ)
    getReport(@Param('sessionCode') sessionCode: string) {
        return this.sessionSvc.getFormattedReport(sessionCode);
    }

    @Get(':sessionCode/report/pdf')
    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.SERVICE_PROGRAMME_READ)
    async downloadReportPdf(
        @Param('sessionCode') sessionCode: string,
        @Res() res: Response,
    ) {
        const pdf = await this.sessionSvc.getReportPdf(sessionCode);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="session-report-${sessionCode}.pdf"`,
            'Content-Length': pdf.length,
        });
        res.end(pdf);
    }

    @Get('event/:eventId/summary-pdf')
    @UseGuards(RolesGuard)
    @Roles(MemberRoleEnum.WORKER)
    async downloadEventSummaryPdfForWorker(
        @Param('eventId', ParseUUIDPipe) eventId: string,
        @CurrentUser() user: MemberAuth,
        @Res() res: Response,
    ) {
        const pdf = await this.sessionSvc.getEventSummaryReportPdfForWorker(eventId, user.id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="event-summary-${eventId}.pdf"`,
            'Content-Length': pdf.length,
        });
        res.end(pdf);
    }

    @Get('event/:eventId/report/pdf')
    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.SERVICE_PROGRAMME_READ)
    async downloadEventReportPdf(
        @Param('eventId', ParseUUIDPipe) eventId: string,
        @Res() res: Response,
    ) {
        const pdf = await this.sessionSvc.getFullEventReportPdf(eventId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="event-report-${eventId}.pdf"`,
            'Content-Length': pdf.length,
        });
        res.end(pdf);
    }

    @Get('event/:eventId/report/summary-pdf')
    @UseGuards(AdminGuard)
    @RequiresPermission(AdminPermission.SERVICE_PROGRAMME_READ)
    async downloadEventSummaryPdf(
        @Param('eventId', ParseUUIDPipe) eventId: string,
        @Res() res: Response,
    ) {
        const pdf = await this.sessionSvc.getEventSummaryReportPdf(eventId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="event-summary-${eventId}.pdf"`,
            'Content-Length': pdf.length,
        });
        res.end(pdf);
    }
}
