import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AdminPermission } from '../enum/admin-permission.enum';
import { Admin } from './admin.entity';
import { BaseEntity } from '../../utility/entity/base.entity';

@Entity({ name: 'admin_roles' })
export class AdminRole extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'text', array: true, default: '{}' })
  permissions: AdminPermission[];

  @OneToMany(() => Admin, (admin) => admin.adminRole)
  admins: Admin[];
}
