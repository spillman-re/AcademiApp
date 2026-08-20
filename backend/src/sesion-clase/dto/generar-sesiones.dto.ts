import { IsDateString } from 'class-validator';

export class GenerarSesionesDto {
  @IsDateString()
  fecha_hasta!: string;
}