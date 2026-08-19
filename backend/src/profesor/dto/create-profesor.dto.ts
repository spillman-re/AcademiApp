import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProfesorDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    nombres!: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    apellidos!: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    telefono?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    especialidad?: string;
}