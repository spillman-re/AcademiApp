import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProrrogaDto {
  @IsInt()
  @Min(1)
  id_obligacion!: number;

  @IsDateString()
  fecha_inicio!: string;

  @IsDateString()
  fecha_fin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  observacion?: string;
}