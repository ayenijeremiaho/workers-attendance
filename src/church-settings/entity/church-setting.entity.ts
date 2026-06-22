import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';

@Entity('church_settings')
export class ChurchSetting extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  key: string;

  @Column({ type: 'varchar', name: 'module_name' })
  moduleName: string;

  @Column({ type: 'jsonb' })
  value: Record<string, unknown>;
}
