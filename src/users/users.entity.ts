import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany  } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Package } from 'src/packages/packages.entity';
import { UserPurchase } from '../game-store/entities/user-purchase.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  login: string;

  @Column()
  password_hash: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value, // При сохранении оставляем как есть
      from: (value: string) => parseFloat(value), // Преобразуем из строки в число
    },
  })
  balance: number;
  

  @Column({ type: 'int', nullable: true })
  referrer_id: number | null;
  
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;
  
  @Column({ default: false })
  isBlocked: boolean;


  @ManyToOne(() => Package, (package_) => package_.users, { nullable: true })
  @JoinColumn({ name: 'package_id' })
  package: Package;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  personalEarningsLimit: number;

  // ✅ Добавляем уровень и клики
  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  clicks: number;

  @Column({
    type: 'decimal', // или 'float'
    precision: 10, // Общее количество цифр
    scale: 2, // Количество цифр после запятой
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  gameBalance: number;

  @Column({ default: 1 }) // По умолчанию у всех "Апельсин" (skin_id = 1)
  skinId: number;


  @OneToMany(() => UserPurchase, (purchase) => purchase.user)
  purchases: UserPurchase[];

  async setPassword(password: string) {
    this.password_hash = await bcrypt.hash(password, 10);
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_hash);
  }
}
