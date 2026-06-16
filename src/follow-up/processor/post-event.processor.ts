import {Injectable, Logger} from '@nestjs/common';
import {InjectQueue, OnQueueFailed, Process, Processor} from '@nestjs/bull';
import {Job, Queue} from 'bull';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {ConfigService} from '@nestjs/config';
import {Event} from '../../event/entity/event.entity';
import {Attendance} from '../../attendance/entity/attendance.entity';
import {AttendanceStatusEnum} from '../../attendance/enums/check-in.enum';
import {EmailQueueService} from '../../utility/service/email-queue.service';
import {FollowUpService} from '../service/follow-up.service';

export const FOLLOW_UP_QUEUE = 'follow-up';
export const POST_EVENT_JOB = 'post-event';
export const ONLINE_WINDOW_CLOSED_JOB = 'online-window-closed';

export interface PostEventJobData {
    eventId: string;
}

export interface OnlineWindowClosedJobData {
    eventId: string;
}

@Injectable()
@Processor(FOLLOW_UP_QUEUE)
export class PostEventProcessor {
    private readonly logger = new Logger(PostEventProcessor.name);
    private readonly onlineWindowHours: number;
    private readonly churchName: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly emailQueueService: EmailQueueService,
        private readonly followUpService: FollowUpService,
        @InjectQueue(FOLLOW_UP_QUEUE)
        private readonly followUpQueue: Queue,
        @InjectRepository(Event)
        private readonly eventRepo: Repository<Event>,
        @InjectRepository(Attendance)
        private readonly attendanceRepo: Repository<Attendance>,
    ) {
        this.onlineWindowHours = this.configService.get<number>('ONLINE_CHECKIN_WINDOW_HOURS');
        this.churchName = this.configService.get<string>('CHURCH_NAME');
    }

    @Process(POST_EVENT_JOB)
    async handlePostEvent(job: Job<PostEventJobData>): Promise<void> {
        const {eventId} = job.data;
        this.logger.log(`Processing post-event job for event ${eventId}`);

        const event = await this.eventRepo.findOne({where: {id: eventId}});
        if (!event) {
            this.logger.warn(`Event ${eventId} not found; skipping post-event job`);
            return;
        }

        const attendances = await this.attendanceRepo.find({
            where: {event: {id: eventId}},
            relations: ['member'],
        });

        const presentMembers = attendances.filter(
            (a) =>
                a.status === AttendanceStatusEnum.PRESENT ||
                a.status === AttendanceStatusEnum.LATE,
        );

        for (const record of presentMembers) {
            if (!record.member?.email) continue;
            this.emailQueueService.queueEmailWithTemplate(
                record.member.email,
                `Thank you for attending — ${event.name}`,
                'thank-you-attendance',
                {
                    name: record.member.firstname,
                    eventName: event.name,
                    churchName: this.churchName,
                },
            );
        }

        this.logger.log(`Queued ${presentMembers.length} thank-you email(s) for event "${event.name}"`);

        if (!event.onlineAttendanceEnabled || event.onlineNotificationSentAt) return;

        const absentMembers = attendances.filter(
            (a) => a.status === AttendanceStatusEnum.ABSENT,
        );

        if (!absentMembers.length) return;

        await this.eventRepo.update(eventId, {onlineNotificationSentAt: new Date()});

        for (const record of absentMembers) {
            if (!record.member?.email) continue;
            this.emailQueueService.queueEmailWithTemplate(
                record.member.email,
                `Did you attend ${event.name} online?`,
                'online-attendance-request',
                {
                    name: record.member.firstname,
                    eventName: event.name,
                    churchName: this.churchName,
                    eventId,
                    windowHours: this.onlineWindowHours,
                },
            );
        }

        this.logger.log(`Queued ${absentMembers.length} online-confirm email(s) for event "${event.name}"`);

        const delayMs = this.onlineWindowHours * 60 * 60 * 1000;
        await this.followUpQueue.add(
            ONLINE_WINDOW_CLOSED_JOB,
            {eventId},
            {delay: delayMs, attempts: 3, backoff: {type: 'fixed', delay: 5000}},
        );
    }

    @Process(ONLINE_WINDOW_CLOSED_JOB)
    async handleOnlineWindowClosed(job: Job<OnlineWindowClosedJobData>): Promise<void> {
        const {eventId} = job.data;
        this.logger.log(`Online window closed for event ${eventId}; creating follow-up tasks`);

        const nonResponders = await this.attendanceRepo.find({
            where: {event: {id: eventId}, status: AttendanceStatusEnum.ABSENT},
            relations: ['member'],
        });

        let created = 0;
        for (const record of nonResponders) {
            if (!record.member) continue;
            const task = await this.followUpService.createTaskForOnlineNonResponder(
                record.member.id,
                eventId,
            );
            if (task) created++;
        }

        this.logger.log(`Created ${created} follow-up task(s) for online non-responders on event ${eventId}`);
    }

    @OnQueueFailed()
    onFailed(job: Job, error: Error): void {
        this.logger.error(`Follow-up job "${job.name}" (${job.id}) failed: ${error.message}`);
    }
}
