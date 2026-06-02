import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';
import { OrdersService, OrderListQuery } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './entities/order.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Orders')
@ApiBearerAuth('JWT')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Create order (customer only)' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'UUID unik per request — mencegah duplicate order',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  @ApiResponse({ status: 409, description: 'Duplicate order (idempotency)' })
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: User,
    @Req() req: Request,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
    // Accept Idempotency-Key from header (preferred) or from body field
    if (idempotencyHeader && !dto.idempotencyKey) {
      dto.idempotencyKey = idempotencyHeader;
    }
    const order = await this.ordersService.create(dto, user, ipAddress);
    return { message: 'Order created successfully', data: order };
  }

  @Get()
  @ApiOperation({
    summary: 'Get order history (customer: own orders, admin: all orders)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  async findAll(@CurrentUser() user: User, @Query() query: OrderListQuery) {
    const result = await this.ordersService.findAll(user, query);
    return {
      message: 'Orders fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail by ID' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const order = await this.ordersService.findOne(id, user);
    return { message: 'Order fetched successfully', data: order };
  }
}
