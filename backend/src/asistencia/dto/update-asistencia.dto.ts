import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAsistenciaDto {
  @IsOptional()
  @IsIn([
    'PRESENTE',
    'AUSENTE',
    'JUSTIFICADO',
    'SUSPENDIDO_POR_MORA',
  ])
  estado_asistencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  observacion?: string;
}