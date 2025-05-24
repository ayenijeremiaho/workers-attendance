import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { NoteTypeEnum } from '../enums/note-type.enums';
import { Note } from '../entity/note.entity';
import { differenceInDays } from 'date-fns';
import {
  ChildDedicationDetails,
  ChildNamingDetails,
  MarriageDetails,
  MemberAttendanceDetails,
} from '../entity/note-details';

@Injectable()
export class NotesAnalyticsService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  async getChildNamingAnalytics(from?: Date, to?: Date) {
    const notes = await this.fetchNotes(NoteTypeEnum.CHILD_NAMING, from, to);

    const total = notes.length;

    const namingAges = notes.map((note) => {
      const details = note.details as ChildNamingDetails;
      return differenceInDays(note.createdAt, details.dateOfBirth);
    });

    const avgNamingAgeInDays = this.calculateAverage(namingAges);

    const topFamily = this.findTopFamily(notes, 'familyName');
    const topName = this.findTopFamily(notes, 'childName');

    return { total, avgNamingAgeInDays, topFamily, topName };
  }

  async getChildDedicationAnalytics(from?: Date, to?: Date) {
    const notes = await this.fetchNotes(
      NoteTypeEnum.CHILD_DEDICATION,
      from,
      to,
    );

    const total = notes.length;
    const now = new Date();
    const upcoming = notes.filter(
      (note) =>
        new Date((note.details as ChildDedicationDetails).dedicationDate) > now,
    ).length;

    const topFamily = this.findTopFamily(notes, 'familyName');
    const topName = this.findTopFamily(notes, 'childName');

    return { total, upcoming, topFamily, topName };
  }

  async getMarriageAnalytics(from?: Date, to?: Date) {
    const notes = await this.fetchNotes(NoteTypeEnum.MARRIAGE, from, to);

    const total = notes.length;
    const dates = notes.map(
      (note) => new Date((note.details as MarriageDetails).weddingDate),
    );
    dates.sort((a, b) => b.getTime() - a.getTime());

    const recentMarriage = dates[0]?.toISOString().split('T')[0] || '';
    const avgPerMonth = this.calculateAveragePerMonth(dates);

    return { total, recentMarriage, avgPerMonth };
  }

  async getAttendanceAnalytics(from?: Date, to?: Date) {
    const notes = await this.fetchNotes(
      NoteTypeEnum.MEMBER_ATTENDANCE,
      from,
      to,
    );

    const totalAttendance = notes.reduce((sum, note) => {
      const details = note.details as MemberAttendanceDetails;
      return sum + details.totalAttendance;
    }, 0);

    const eventMap = this.groupBy(
      notes,
      (note) =>
        (note.details as MemberAttendanceDetails).event?.name || 'Unknown',
    );

    const mostAttendedEvent = this.findTopKey(eventMap);
    const avgAttendance = this.calculateAverage(Object.values(eventMap));

    return { totalAttendance, mostAttendedEvent, avgAttendance };
  }

  private async fetchNotes(type: NoteTypeEnum, from?: Date, to?: Date) {
    const [startDate, endDate] = this.resolveDateRange(from, to);
    return this.noteRepository.find({
      where: { type, createdAt: Between(startDate, endDate) },
    });
  }

  private resolveDateRange(from?: Date, to?: Date): [Date, Date] {
    const end = to ? new Date(to) : new Date();
    const start = from
      ? new Date(from)
      : new Date(new Date().setDate(end.getDate() - 30));
    return [start, end];
  }

  private calculateAverage(values: number[]): number {
    return values.length
      ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
      : 0;
  }

  private calculateAveragePerMonth(dates: Date[]): number {
    if (!dates.length) return 0;
    const first = dates[dates.length - 1];
    const now = new Date();
    const months = Math.max(
      (now.getFullYear() - first.getFullYear()) * 12 +
        now.getMonth() -
        first.getMonth(),
      1,
    );
    return Number((dates.length / months).toFixed(1));
  }

  private findTopFamily(notes: Note[], key: string): string {
    const familyCount = this.groupBy(
      notes,
      (note) => (note.details as any)[key],
    );
    return this.findTopKey(familyCount);
  }

  private groupBy<T>(
    items: T[],
    keyFn: (item: T) => string,
  ): Record<string, number> {
    return items.reduce(
      (acc, item) => {
        const key = keyFn(item);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private findTopKey(map: Record<string, number>): string {
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  }
}
