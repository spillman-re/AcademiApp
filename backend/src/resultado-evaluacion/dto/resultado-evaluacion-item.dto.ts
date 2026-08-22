import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class ResultadoEvaluacionItemDto {
  @IsNumber()
  id_inscripcion!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  nota!: number;
}