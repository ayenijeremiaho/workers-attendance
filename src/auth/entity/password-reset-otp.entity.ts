import {Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity('password_reset_otps')
export class PasswordResetOtp {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column()
    memberId: string;

    @Column()
    otpHash: string;

    @Column({type: 'timestamptz'})
    expiresAt: Date;

    @Column({type: 'timestamptz', nullable: true})
    usedAt: Date | null;

    @CreateDateColumn({type: 'timestamptz'})
    createdAt: Date;
}
