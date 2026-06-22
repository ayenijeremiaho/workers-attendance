import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {BulkUploadJobStatus, BulkUploadType} from '../enum/finance.enum';
import {Admin} from '../../admin/entity/admin.entity';
import {BankImportProfile} from './bank-import-profile.entity';

@Entity('finance_bulk_upload_jobs')
export class BulkUploadJob extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({type: 'varchar', name: 'upload_type'})
    uploadType: BulkUploadType;

    @Column({type: 'varchar', name: 'file_hash'})
    fileHash: string;

    @Column({type: 'varchar', name: 'original_filename'})
    originalFilename: string;

    @Column({type: 'varchar', default: BulkUploadJobStatus.QUEUED})
    status: BulkUploadJobStatus;

    @Column({type: 'int', default: 0, name: 'total_rows'})
    totalRows: number;

    @Column({type: 'int', default: 0, name: 'processed_rows'})
    processedRows: number;

    @Column({type: 'text', nullable: true, name: 'error_message'})
    errorMessage: string | null;

    @ManyToOne(() => BankImportProfile, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'profile_id'})
    profile: BankImportProfile | null;

    @ManyToOne(() => Admin, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'created_by_id'})
    createdBy: Admin;
}
