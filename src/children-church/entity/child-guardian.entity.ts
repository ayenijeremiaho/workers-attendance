import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,} from 'typeorm';
import {Member} from '../../member/entity/member.entity';
import {ChildProfile} from './child-profile.entity';
import {GuardianRelationshipEnum} from '../enums/guardian-relationship.enum';
import {BaseEntity} from '../../utility/entity/base.entity';

@Entity('child_guardians')
export class ChildGuardian extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => ChildProfile, (profile) => profile.guardians, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'child_id'})
    child: ChildProfile;

    @Column()
    fullName: string;

    @Column({nullable: true})
    phoneNumber: string | null;

    @Column({nullable: true})
    email: string | null;

    @Column()
    relationship: GuardianRelationshipEnum;

    @Column({nullable: true})
    photoUrl: string | null;

    @Column({default: true})
    isAuthorizedPickup: boolean;

    @ManyToOne(() => Member, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'member_id'})
    member: Member | null;
}
