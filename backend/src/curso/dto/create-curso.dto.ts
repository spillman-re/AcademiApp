import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCursoDto {
  @IsString()
  @IsNotEmpty()
  nombre_curso!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  duracion?: string;

  @IsNumber()
  @Min(0)
  precio!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_matricula?: number;
}