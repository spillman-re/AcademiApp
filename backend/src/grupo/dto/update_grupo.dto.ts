import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateGrupoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre_grupo?: string;

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duracion_meses?: number;
}