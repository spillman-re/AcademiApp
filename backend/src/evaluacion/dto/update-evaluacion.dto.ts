import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateEvaluacionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipo_evaluacion?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}