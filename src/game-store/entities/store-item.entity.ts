import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum StoreItemType {
  SKIN = 'SKIN',
  MULTIPLIER = 'MULTIPLIER',
  REFERRAL_LIMIT_BOOST = 'REFERRAL_LIMIT_BOOST',
}

@Entity('store_items')
export class StoreItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: StoreItemType })
  type: StoreItemType;

  @Column({ type: 'int', default: 0 })
  price: number;

  // 🔹 Для скинов и множителей (x1.2, x2, x3 и т. д.)
  @Column({ type: 'float', nullable: true, default: null })
  multiplier?: number;

  // 🔹 Для бустеров реферального лимита (+10%, +20%)
  @Column({ type: 'int', nullable: true, default: null })
  bonus?: number;

  // 🔹 Длительность эффекта (например, 24 часа) - только для множителей
  @Column({ type: 'int', nullable: true, default: null })
  duration?: number;
}
