import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSesionClaseDto {
  @IsOptional()
  @IsDateString()
  fecha_programada?: string;

  @IsOptional()
  @IsString()
  hora_inicio?: string;

  @IsOptional()
  @IsString()
  hora_fin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tema?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}