import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('device_reset_otps')
export class DeviceResetOtp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  memberId: string;

  @Column()
  otpHash: string;

  // The new device to register on successful verification — locked in at request time.
  // This prevents an intercepted OTP from being used to register an arbitrary device.
  @Column()
  newDeviceId: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
