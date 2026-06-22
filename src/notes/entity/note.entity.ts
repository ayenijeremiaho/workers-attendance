import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { NoteTypeEnum } from '../enums/note-type.enums';
import { NoteDetails } from '../types/note-details.type';
import { Transform } from 'class-transformer';
import { BaseEntity } from '../../utility/entity/base.entity';

@Entity({ name: 'notes' })
export class Note extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: NoteTypeEnum;

  @Column({ type: 'json', name: 'details' })
  @Transform(({ value }) => JSON.parse(JSON.stringify(value)), {
    toPlainOnly: true,
  })
  details: NoteDetails;
}
