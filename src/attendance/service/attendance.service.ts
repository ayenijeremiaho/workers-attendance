import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CheckInDto } from '../dto/check-in.dto';
import { Attendance } from '../entity/attendance.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { WorkerService } from '../../user/service/worker.service';
import { EventService } from '../../event/service/event.service';
import { UtilityService } from '../../utility/utility.service';
import * as moment from 'moment';
import { WorkerStatusEnum } from '../../user/enums/worker-status.enum';
import { ConfigService } from '@nestjs/config';
import { CheckInStatusEnum } from '../enums/check-in.enum';
import { Worker } from '../../user/entity/worker.entity';
import { Event } from '../../event/entity/event.entity';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UserAuth } from '../../auth/interface/auth.interface';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly eventService: EventService,
    private readonly configService: ConfigService,
    private readonly workerService: WorkerService,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  async checkin(
    user: UserAuth,
    checkInDto: CheckInDto,
  ): Promise<{ message: string }> {
    const workerId = user.id;
    const { eventId, location: userLocation } = checkInDto;

    const checkinDateTime = new Date(checkInDto.checkinTime);
    if (isNaN(checkinDateTime.getTime())) {
      this.createErrorResponse('Invalid check-in time format');
    }

    if (await this.isAttendanceAlreadyTaken(workerId, eventId)) {
      this.createErrorResponse('Attendance previously taken');
    }

    const worker = await this.workerService.get(workerId);
    if (worker.status === WorkerStatusEnum.INACTIVE) {
      this.createErrorResponse(
        'You cannot check-in, your account is suspended',
      );
    }

    const event = await this.eventService.get(eventId);
    const eventConfig = event.eventConfig;

    if (!this.isSameDay(event.startDate, checkinDateTime)) {
      this.createErrorResponse('Check-in date does not match the event date');
    }

    const checkInStartTime = this.calculateCheckInStartTime(
      event.startDate,
      eventConfig.checkinStartTimeInSeconds,
    );
    const lateCheckInStartTime = this.calculateLateCheckInStartTime(
      event.startDate,
      eventConfig.lateComingStartTimeInSeconds,
    );
    const checkInStopTime = this.calculateCheckInStopTime(
      event.startDate,
      eventConfig.checkinStopTimeInSeconds,
    );

    if (moment(checkinDateTime).isBefore(checkInStartTime)) {
      this.createErrorResponse('Check-in is yet to start');
    } else if (moment(checkinDateTime).isAfter(checkInStopTime)) {
      this.createErrorResponse(
        'You can no longer check-in, check-in is closed',
      );
    }

    const checkInStatus = this.getCheckInStatus(
      lateCheckInStartTime,
      event.startDate,
    );
    const distance = UtilityService.calculateDistanceInMeters(
      userLocation.latitude,
      userLocation.longitude,
      eventConfig.locationLatitude,
      eventConfig.locationLongitude,
    );

    if (this.isDistanceTooFar(distance, eventConfig.allowedDistanceInMeters)) {
      this.createErrorResponse(
        'Check-in location is too far from the event location',
      );
    }

    await this.saveAttendance(
      worker,
      event,
      checkinDateTime,
      checkInStatus,
      userLocation,
    );
    return this.createSuccessResponse('Check-in successful');
  }

  async markAbsenteesAndSendDepartmentEmail() {
    this.logger.log('Running absence marking job...');

    const currentTime = new Date();
    const events = await this.eventService.findByAbsenteesNotUpdated();

    if (events.length === 0) {
      this.logger.log('No events found for absence marking');
      return;
    }

    this.logger.log(`Found ${events.length} events for absence marking`);

    for (const event of events) {
      this.logger.log(`Processing event: ${event.name}`);

      const absentees = await this.workerService.getWorkersNotCheckedInForEvent(
        event.id,
      );

      if (absentees.length === 0) {
        this.logger.log(`No absent workers found for event ${event.name}`);
        continue;
      }

      const attendanceRecords = absentees.map((worker) => ({
        worker,
        event,
        checkinStatus: CheckInStatusEnum.ABSENT,
        checkinTime: currentTime,
        workerLocation: { longitude: 0, latitude: 0 },
      }));

      if (attendanceRecords.length > 0) {
        await this.attendanceRepository.save(attendanceRecords);
        this.logger.log(
          `Marked ${attendanceRecords.length} workers as absent for event ${event.name}`,
        );
      }

      event.markedAbsent = true;
      await this.eventService.updateEvent(event);

      this.logger.log(`Updated event ${event.name} as marked absent`);
    }

    this.logger.log('Absence marking job completed');
  }

  async getWorkersCheckinHistory(
    user: UserAuth,
    page: number = 1,
    limit: number = 10,
    attendanceDate?: string,
  ): Promise<PaginationResponseDto<Attendance>> {
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    const workerId = user.id;

    const queryBuilder = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.event', 'event')
      .where('attendance.worker.id = :workerId', { workerId })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('attendance.createdAt', 'DESC');

    if (attendanceDate) {
      this.appendAttendanceDate(attendanceDate, queryBuilder);
    }

    const [attendances, total] = await queryBuilder.getManyAndCount();

    return UtilityService.createPaginationResponse<Attendance>(
      attendances,
      page,
      limit,
      total,
    );
  }

  async getAllCheckInHistory(
    page: number = 1,
    limit: number = 10,
    workerId?: string,
    eventId?: string,
    attendanceDate?: string,
  ): Promise<PaginationResponseDto<Attendance>> {
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    const queryBuilder = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.event', 'event')
      .leftJoinAndSelect('attendance.worker', 'worker')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('attendance.createdAt', 'DESC');

    if (workerId) {
      queryBuilder.andWhere('worker.id = :workerId', { workerId });
    }

    if (eventId) {
      queryBuilder.andWhere('event.id = :eventId', { eventId });
    }

    if (attendanceDate) {
      this.appendAttendanceDate(attendanceDate, queryBuilder);
    }

    const [attendances, total] = await queryBuilder.getManyAndCount();

    return UtilityService.createPaginationResponse<Attendance>(
      attendances,
      page,
      limit,
      total,
    );
  }

  private createErrorResponse(message: string) {
    throw new BadRequestException(message);
  }

  private createSuccessResponse(message: string): {
    message: string;
  } {
    return { message };
  }

  private calculateCheckInStartTime(
    eventStartDate: Date,
    checkinStartTimeInSeconds: number,
  ): moment.Moment {
    return moment(eventStartDate).add(checkinStartTimeInSeconds, 'seconds');
  }

  private calculateLateCheckInStartTime(
    eventStartDate: Date,
    lateComingStartTimeInSeconds: number,
  ): moment.Moment {
    return moment(eventStartDate).add(lateComingStartTimeInSeconds, 'seconds');
  }

  private calculateCheckInStopTime(
    eventStartDate: Date,
    checkinStopTimeInSeconds: number,
  ): moment.Moment {
    return moment(eventStartDate).add(checkinStopTimeInSeconds, 'seconds');
  }

  private appendAttendanceDate(
    attendanceDate: string,
    queryBuilder: SelectQueryBuilder<Attendance>,
  ) {
    const attendanceDateTime = new Date(attendanceDate);
    if (isNaN(attendanceDateTime.getTime())) {
      throw new BadRequestException('Invalid attendance date format');
    }

    const startOfDay = moment(attendanceDateTime).startOf('day').toDate();
    const endOfDay = moment(attendanceDateTime).endOf('day').toDate();
    queryBuilder.andWhere(
      'attendance.checkinTime BETWEEN :startOfDay AND :endOfDay',
      { startOfDay, endOfDay },
    );
  }

  private async isAttendanceAlreadyTaken(
    workerId: string,
    eventId: string,
  ): Promise<boolean> {
    const attendance = await this.attendanceRepository.findOne({
      where: { worker: { id: workerId }, event: { id: eventId } },
    });
    return !!attendance;
  }

  private isSameDay(eventDate: Date, checkInTime: Date): boolean {
    return moment(eventDate)
      .startOf('day')
      .isSame(moment(checkInTime).startOf('day'));
  }

  private getCheckInStatus(
    lateCheckInStartTime: moment.Moment,
    checkinTime: Date,
  ): CheckInStatusEnum {
    if (moment(checkinTime).isAfter(lateCheckInStartTime)) {
      return CheckInStatusEnum.LATE;
    } else {
      return CheckInStatusEnum.EARLY;
    }
  }

  private isDistanceTooFar(distance: number, allowedDistance: number): boolean {
    this.logger.log('Distance from event location: ' + distance);
    if (distance > allowedDistance) {
      this.logger.log(
        `Check-in location is too far from the event location, allowed distance is
        ${allowedDistance} meters, actual distance is ${distance} meters`,
      );
      return this.shouldEnforceDistanceCheck();
    }
    return false;
  }

  private async saveAttendance(
    worker: Worker,
    event: Event,
    checkinTime: Date,
    checkinStatus: CheckInStatusEnum,
    userLocation: any,
  ): Promise<void> {
    const attendance = this.attendanceRepository.create({
      worker,
      event,
      checkinTime,
      checkinStatus,
      workerLocation: userLocation,
    });
    await this.attendanceRepository.save(attendance);
  }

  private shouldEnforceDistanceCheck(): boolean {
    return this.configService.get<boolean>('ENFORCE_DISTANCE_CHECK') === true;
  }
}
