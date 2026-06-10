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
} from '../entity/note-details';

@Injectable()
export class NotesAnalyticsService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  async getChildNamingAnalytics(from?: Date, to?: Date) {
    const notes = await this.fetchNotes(NoteTypeEnum.CHILD_NAMING, from, to);
    const namingAges = notes.map((note) => {
      const details = note.details as ChildNamingDetails;
      return differenceInDays(note.createdAt, details.dateOfBirth);
    });
    const topFamily = this.findTopByKey(notes, 'familyName');
    const topName = this.findTopByKey(notes, 'childName');
    return { total: notes.length, avgNamingAgeInDays: this.calcAvg(namingAges), topFamily, topName };
  }

  async getChildDedicationAnalytics(from?: Date, to?: Date) {
    const notes = await this.fetchNotes(NoteTypeEnum.CHILD_DEDICATION, from, to);
    const now = new Date();
    const upcoming = notes.filter(
      (note) => new Date((note.details as ChildDedicationDetails).dedicationDate) > now,
    ).length;
    const topFamily = this.findTopByKey(notes, 'familyName');
    const topName = this.findTopByKey(notes, 'childName');
    return { total: notes.length, upcoming, topFamily, topName };
  }

  async getMarriageAnalytics(from?: Date, to?: Date) {
    const notes = await this.fetchNotes(NoteTypeEnum.MARRIAGE, from, to);
    const dates = notes
      .map((note) => new Date((note.details as MarriageDetails).weddingDate))
      .sort((a, b) => b.getTime() - a.getTime());
    const recentMarriage = dates[0]?.toISOString().split('T')[0] ?? '';
    return { total: notes.length, recentMarriage, avgPerMonth: this.calcAvgPerMonth(dates) };
  }

  private async fetchNotes(type: NoteTypeEnum, from?: Date, to?: Date): Promise<Note[]> {
    const [start, end] = this.resolveDateRange(from, to);
    return this.noteRepository.find({ where: { type, createdAt: Between(start, end) } });
  }

  private resolveDateRange(from?: Date, to?: Date): [Date, Date] {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(new Date().setDate(end.getDate() - 30));
    return [start, end];
  }

  private calcAvg(values: number[]): number {
    return values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0;
  }

  private calcAvgPerMonth(dates: Date[]): number {
    if (!dates.length) return 0;
    const first = dates[dates.length - 1];
    const now = new Date();
    const months = Math.max(
      (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth(),
      1,
    );
    return Number((dates.length / months).toFixed(1));
  }

  private findTopByKey(notes: Note[], key: string): string {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      const val = (note.details as any)[key] as string;
      counts[val] = (counts[val] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  }
}
