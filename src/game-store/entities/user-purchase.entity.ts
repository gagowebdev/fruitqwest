import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { StoreItem } from './store-item.entity';
import { User } from '../../users/users.entity';

@Entity('user_purchases')
export class UserPurchase {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.purchases)
  user: User;

  @ManyToOne(() => StoreItem, { eager: true }) // ✅ Добавили eager: true, чтобы загружалось сразу
  item: StoreItem;

  @CreateDateColumn()
  purchasedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

}
