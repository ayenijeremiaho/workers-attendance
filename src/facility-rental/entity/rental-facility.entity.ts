import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';

@Entity({ name: 'rental_facilities' })
export class RentalFacility extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  basePrice: number;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
