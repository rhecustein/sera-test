import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class OrderItemDto {
  @ApiProperty({ name: 'product_id', format: 'uuid', example: 'product-uuid-here' })
  @IsUUID()
  @Transform(({ value, obj }) => value ?? obj['product_id'])
  productId: string;

  @ApiProperty({ minimum: 1, example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    required: false,
    description: 'Idempotency key to prevent duplicate orders',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
