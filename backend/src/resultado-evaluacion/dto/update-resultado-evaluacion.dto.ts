import {
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateResultadoEvaluacionDto {
  @IsOptional()
  @IsEnum(['CALIFICADO', 'NO_SE_PRESENTO'])
  estado_resultado?: 'CALIFICADO' | 'NO_SE_PRESENTO';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  nota?: number;
}