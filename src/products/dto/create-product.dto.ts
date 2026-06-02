import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Toyota Avanza' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'MPV 7 seater', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 250000000, type: Number })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsNumber()
  @Min(0)
  stock: number;
}
