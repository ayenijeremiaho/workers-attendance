import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';

@Entity('child_age_groups')
export class ChildAgeGroup extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'int' })
  minAgeMonths: number;

  @Column({ type: 'int' })
  maxAgeMonths: number;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;
}
