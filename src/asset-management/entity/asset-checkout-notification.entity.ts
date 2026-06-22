import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {AssetCheckout} from './asset-checkout.entity';

export enum CheckoutNotificationType {
    OVERDUE_REMINDER = 'OVERDUE_REMINDER',
    RETURN_CONFIRMED = 'RETURN_CONFIRMED',
}

@Entity('asset_checkout_notifications')
export class AssetCheckoutNotification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => AssetCheckout, {nullable: false, onDelete: 'CASCADE'})
    @JoinColumn({name: 'checkout_id'})
    checkout: AssetCheckout;

    @Column({type: 'varchar'})
    type: CheckoutNotificationType;

    @Column({type: 'int', nullable: true, name: 'days_overdue'})
    daysOverdue: number | null;

    @CreateDateColumn({type: 'timestamptz', name: 'sent_at'})
    sentAt: Date;
}
