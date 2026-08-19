import { IsIn, IsNotEmpty, IsString, } from 'class-validator';

export class CreateHorarioDto {

    //No guardamos el id_grupo porque lo recibiremos desde la URL
    //de la siguiente manera. POST /grupos/id/horarios

    @IsNotEmpty()
    @IsString()
    @IsIn([
        'LUNES',
        'MARTES',
        'MIERCOLES',
        'JUEVES',
        'VIERNES',
        'SABADO',
        'DOMINGO',
    ])
    dia_semana!: string;

    @IsNotEmpty()
    @IsString()
    hora_inicio!: string;

    @IsNotEmpty()
    @IsString()
    hora_fin!: string;
}