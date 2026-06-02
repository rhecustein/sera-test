import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { ActivityLog } from '../activity-logs/entities/activity-log.entity';
import { FailedJob } from '../queue/entities/failed-job.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'sera_user',
  password: process.env.DB_PASS || 'sera_password',
  database: process.env.DB_NAME || 'sera_db',
  entities: [User, Product, Order, OrderItem, ActivityLog, FailedJob],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
