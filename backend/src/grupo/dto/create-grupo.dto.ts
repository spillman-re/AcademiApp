import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateGrupoDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  id_curso!: number;

  @IsNotEmpty()
  @IsString()
  nombre_grupo!: string;

  @IsNotEmpty()
  @IsDateString()
  fecha_inicio!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  duracion_meses!: number;
}