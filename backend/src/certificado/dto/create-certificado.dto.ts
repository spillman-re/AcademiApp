import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCertificadoDto {
  @IsInt()
  id_inscripcion!: number;

  @IsDateString()
  fecha_emision!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  codigo_certificado!: string;
}