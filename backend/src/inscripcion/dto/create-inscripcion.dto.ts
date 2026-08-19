import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateInscripcionDto {
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    id_estudiante!: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    id_grupo!: number;

    @IsOptional()
    @IsString()
    observacion?: string;
}