import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique,} from 'typeorm';
import {Member} from './member.entity';
import {BaseEntity} from '../../utility/entity/base.entity';
import {SessionSurface} from '../../auth/enum/session-surface.enum';

@Entity({name: 'member_sessions'})
@Unique(['member', 'surface'])
export class MemberSession extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => Member, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'member_id'})
    member: Member;

    @Index()
    @Column({type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP'})
    lastLogin: Date;

    @Column({type: 'timestamptz', nullable: true})
    lastLogout: Date;

    @Column({nullable: true, type: 'text'})
    hashedRefreshToken: string;

    @Column({type: 'character varying', default: SessionSurface.MEMBER})
    surface: SessionSurface;
}
