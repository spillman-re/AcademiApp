import { IsOptional, IsString } from 'class-validator';

export class UpdateInscripcionDto {
    @IsOptional()
    @IsString()
    observacion?: string;
}