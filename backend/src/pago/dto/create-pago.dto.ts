import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePagoDto {
  @IsInt()
  id_obligacion!: number;

  @IsOptional()
  @IsDateString()
  fecha_pago?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto_pagado!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  metodo_pago!: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}