import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { Member } from '../../member/entity/member.entity';

@Unique(['recipient', 'sender', 'year'])
@Entity('birthday_wishes')
export class BirthdayWish extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  message: string;

  @Index()
  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  recipient: Member;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  sender: Member | null;

  @Index()
  @Column({ type: 'smallint' })
  year: number;
}
