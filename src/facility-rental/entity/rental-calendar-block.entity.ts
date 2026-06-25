import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { RentalFacility } from './rental-facility.entity';

@Entity({ name: 'rental_calendar_blocks' })
export class RentalCalendarBlock extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RentalFacility, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn()
  facility: RentalFacility;

  @Column({ type: 'timestamptz' })
  startDateTime: Date;

  @Column({ type: 'timestamptz' })
  endDateTime: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;
}
