import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEvaluacionDto {
  @IsInt()
  id_sesion!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipo_evaluacion!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}