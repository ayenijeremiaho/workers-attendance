import {Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {AuditAction} from '../service/audit-log.service';
import {Member} from '../../member/entity/member.entity';

@Entity('audit_logs')
@Index(['action'])
@Index(['targetId'])
@Index(['createdAt'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    action: AuditAction;

    /**
     * FK to the member who performed the action. SET NULL when the member is deleted
     * so audit history is preserved. Use actor.id to retrieve the actor's identity.
     */
    @Index()
    @ManyToOne(() => Member, {nullable: true, onDelete: 'SET NULL', eager: false})
    @JoinColumn({name: 'actorId'})
    actor: Member | null;

    @Column({nullable: true})
    targetId: string | null;

    @Column({nullable: true})
    targetEmail: string | null;

    @Column({type: 'jsonb', nullable: true})
    metadata: Record<string, unknown> | null;

    @CreateDateColumn({type: 'timestamptz'})
    createdAt: Date;
}
