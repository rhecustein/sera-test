import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderJobsProducer } from '../queue/jobs/order-jobs.producer';

export interface OrderListQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface PaginatedOrders {
  data: Order[];
  meta: { page: number; limit: number; total: number; total_formatted: string; totalPages: number };
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly orderJobsProducer: OrderJobsProducer,
  ) {}

  async create(dto: CreateOrderDto, user: User, ipAddress?: string): Promise<Order> {
    const idempotencyKey = dto.idempotencyKey || crypto.randomUUID();

    const existing = await this.orderRepository.findOne({
      where: { idempotencyKey },
    });
    if (existing) {
      throw new ConflictException(
        `Order with idempotency key "${idempotencyKey}" already exists`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const products: Product[] = [];
      for (const item of dto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
        });
        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
          );
        }
        products.push(product);
      }

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const product = products[i];
        await queryRunner.manager.decrement(
          Product,
          { id: product.id },
          'stock',
          item.quantity,
        );
      }

      const totalPrice = dto.items.reduce((sum, item, i) => {
        return sum + Number(products[i].price) * item.quantity;
      }, 0);

      const order = queryRunner.manager.create(Order, {
        userId: user.id,
        totalPrice,
        status: OrderStatus.PENDING,
        idempotencyKey,
      });
      const savedOrder = await queryRunner.manager.save(Order, order);

      const orderItems = dto.items.map((item, i) =>
        queryRunner.manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: products[i].price,
        }),
      );
      await queryRunner.manager.save(OrderItem, orderItems);

      await queryRunner.commitTransaction();

      const fullOrder = await this.orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: { items: { product: true } },
      });

      await Promise.allSettled([
        this.orderJobsProducer.dispatchInvoiceEmail({
          orderId: fullOrder.id,
          userEmail: user.email,
          userName: user.name,
          order: fullOrder,
        }),
        this.orderJobsProducer.dispatchActivityLog({
          orderId: fullOrder.id,
          userId: user.id,
          action: 'order.created',
          payload: { totalPrice: fullOrder.totalPrice, itemCount: dto.items.length },
          ipAddress,
        }),
        this.orderJobsProducer.dispatchNotification({
          orderId: fullOrder.id,
          userId: user.id,
          message: `Order #${fullOrder.id.slice(0, 8).toUpperCase()} berhasil dibuat. Total: Rp ${Number(fullOrder.totalPrice).toLocaleString('id-ID')}`,
        }),
      ]);

      return fullOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(user: User, query: OrderListQuery = {}): Promise<PaginatedOrders> {
    const { page = 1, limit = 10, status } = query;
    const p = Number(page);
    const l = Math.min(Number(limit), 100);
    const offset = (p - 1) * l;
    const isAdmin = user.role === UserRole.ADMIN;

    // Build WHERE clause for raw query
    const conditions: string[] = ['"deleted_at" IS NULL'];
    const params: any[] = [];
    let idx = 1;

    if (!isAdmin) {
      conditions.push(`"user_id" = $${idx++}`);
      params.push(user.id);
    }
    if (status) {
      conditions.push(`"status" = $${idx++}::orders_status_enum`);
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // Approximate total count — fast even on 7M+ rows
    // Falls back to exact count only when filters narrow the dataset significantly
    let total: number;
    if (isAdmin && !status) {
      const approx = await this.dataSource.query(
        `SELECT reltuples::bigint AS n FROM pg_class WHERE relname = 'orders'`,
      );
      total = Number(approx[0]?.n ?? 0);
    } else {
      const countResult = await this.dataSource.query(
        `SELECT COUNT(*)::int AS n FROM orders WHERE ${whereClause}`,
        params,
      );
      total = Number(countResult[0]?.n ?? 0);
    }

    // Fetch page — uses IDX_orders_deleted_at_created_at (or user/status composite index)
    const rows = await this.dataSource.query(
      `SELECT id FROM orders WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, l, offset],
    );

    const ids: string[] = rows.map((r: any) => r.id);

    let data: Order[] = [];
    if (ids.length > 0) {
      data = await this.orderRepository
        .createQueryBuilder('o')
        .leftJoinAndSelect('o.items', 'item')
        .leftJoinAndSelect('item.product', 'product')
        .where('o.id IN (:...ids)', { ids })
        .orderBy('o.createdAt', 'DESC')
        .getMany();
    }

    const totalPages = Math.ceil(total / l);
    return {
      data,
      meta: {
        page: p,
        limit: l,
        total,
        total_formatted: total.toLocaleString('id-ID'),
        totalPages,
      },
    };
  }

  async findOne(id: string, user: User): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: { product: true } },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    if (user.role !== UserRole.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }
}
