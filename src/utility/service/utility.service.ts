import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { PaginationResponseDto } from '../dto/pagination-response.dto';
import { plainToInstance } from 'class-transformer';
import { ClassConstructor } from 'class-transformer/types/interfaces';
import { Note } from '../../notes/entity/note.entity';
import { NoteDto } from '../../notes/dto/note.dto';
import { NotesService } from '../../notes/service/notes.service';

@Injectable()
export class UtilityService {
  private readonly logger = new Logger(UtilityService.name);

  constructor(private readonly configService: ConfigService) {}

  public static isValidDateFormat(date?: string): boolean {
    if (!date) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(date) && !isNaN(new Date(date).getTime());
  }

  public static calculateDistanceInMeters(
    userLatitude: number,
    userLongitude: number,
    eventLatitude: number,
    eventLongitude: number,
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(eventLatitude - userLatitude);
    const dLon = this.deg2rad(eventLongitude - userLongitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(userLatitude)) *
        Math.cos(this.deg2rad(eventLatitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Distance in meters
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  public static createPaginationResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
  ): PaginationResponseDto<T> {
    const totalCount = total || 0;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;

    return {
      data,
      page,
      limit,
      totalCount,
      totalPages,
    };
  }

  public static getPaginationResponseDto<I, O>(
    response: PaginationResponseDto<I>,
    classConstructor: ClassConstructor<O>,
  ): PaginationResponseDto<O> {
    const mapToDtos = response.data.map((value) => {
      const result: any = plainToInstance(classConstructor, value, {
        excludeExtraneousValues: true,
      });

      if (result instanceof NoteDto) {
        NotesService.getNoteDetailsDto(result, value as Note);
      }

      return result;
    });
    return {
      ...response,
      data: mapToDtos,
    };
  }

  public static capitalizeFirstLetter(name: string): string {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  public static generateRandomPassword(): string {
    return Math.random().toString(36).slice(-8);
  }

  public static async hashValue(value: string): Promise<string> {
    return await argon2.hash(value);
  }

  public static async verifyHashedValue(
    value: string,
    hashedValue: string,
  ): Promise<boolean> {
    return await argon2.verify(hashedValue, value);
  }

  public sendEmail(
    to: string | [string],
    subject: string,
    body: string,
    cc?: string | [string],
  ) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to,
      cc,
      subject,
      html: body,
    };

    this.getMailTransport()
      .sendMail(mailOptions)
      .then(() => {
        this.logger.log(`SENT ${subject} EMAIL TO ${to}`);
      })
      .catch((error) => {
        this.logger.error(`ERROR SENDING ${subject} EMAIL TO ${to}`, error);
      });
  }

  private getMailTransport() {
    return nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<boolean>('EMAIL_SECURE'),
      service: this.configService.get<string>('EMAIL_SERVICE'),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }
}
