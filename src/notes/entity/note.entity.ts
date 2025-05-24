import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NoteTypeEnum } from '../enums/note-type.enums';
import { NoteDetails } from '../types/note-details.type';
import { Transform } from 'class-transformer';

@Entity({ name: 'notes' })
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    enum: NoteTypeEnum,
    type: 'enum',
    enumName: 'type',
  })
  type: NoteTypeEnum;

  @Column({ type: 'json', name: 'details' })
  @Transform(({ value }) => JSON.parse(JSON.stringify(value)), {
    toPlainOnly: true,
  })
  details: NoteDetails;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
