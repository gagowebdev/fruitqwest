import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from 'src/users/users.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  REFERRAL_BONUS = 'referral_bonus',
  PACKAGE_PURCHASE = 'package_purchase',
}

export enum TransactionMethod {
  TONKEEPER = 'tonkeeper', // ✅ Добавили TonKeeper для депозитов
  CARD = 'card', // ✅ Оставили карту только для вывода
}

export enum TransactionStatus {
  CREATED = 'created',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: TransactionMethod, nullable: true })
  method: TransactionMethod;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true }) // 6 знаков после запятой для точности
  ton_amount: number | null;


  @Column({ type: 'varchar', nullable: true })
  recipient: string;

  @Column({ type: 'int', nullable: true })
  referral_id: number | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
