import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSesionClaseDto {
  @IsInt()
  id_grupo!: number;

  @IsOptional()
  @IsInt()
  id_horario?: number;

  @IsDateString()
  fecha_programada!: string;

  @IsString()
  hora_inicio!: string;

  @IsString()
  hora_fin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tema?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}