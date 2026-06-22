import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { ExternalPayeeType } from '../enum/finance.enum';

@Entity('finance_external_payees')
export class ExternalPayee extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  type: ExternalPayeeType;

  @Column({ type: 'varchar', nullable: true, name: 'contact_email' })
  contactEmail: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'contact_phone' })
  contactPhone: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'account_number' })
  accountNumber: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'bank_name' })
  bankName: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'registration_number' })
  registrationNumber: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;
}
