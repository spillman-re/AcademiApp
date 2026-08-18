import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateGrupoDto {
    @IsNotEmpty()
    @IsString()
    nombre_grupo!: string;
}