import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('products')
@Index(['name'])
@Index(['deletedAt'])
@Index(['price'])
export class Product {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ length: 255 })
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ type: Number })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: number;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  stock: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
