import { Body, Controller, Delete, Get, Param, Patch, Post, } from '@nestjs/common';

import { HorarioClaseService } from './horario-clase.service';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';

@Controller()
export class HorarioClaseController {
    constructor(private readonly horarioClaseService: HorarioClaseService) {}

    //Queremos ver los horarios de un determinado grupo,
    // listar todos los registros de horario no seria una informacion útil.
    // Por eso grupos/:idGrupo/horarios
    @Get('grupos/:idGrupo/horarios')
    getHorariosPorGrupo(@Param('idGrupo') idGrupo: string) {
        return this.horarioClaseService.getHorariosPorGrupo(Number(idGrupo));
    }

    //El id_grupo no se manda, se toma de la URL
    @Post('grupos/:idGrupo/horarios')
    createHorario( @Param('idGrupo') idGrupo: string, @Body() horario: CreateHorarioDto) {
        return this.horarioClaseService.createHorario(Number(idGrupo), horario);
    }

    //Para tomar el registro de un horario específico
    @Get('horarios/:id')
    getHorario(@Param('id') id: string) {
        return this.horarioClaseService.getHorario(Number(id));
    }

    @Patch('horarios/:id')
    updateHorario(@Param('id') id: string, @Body() horario: UpdateHorarioDto) {
        return this.horarioClaseService.updateHorario(Number(id), horario);
    }

    @Delete('horarios/:id')
    deleteHorario(@Param('id') id: string) {
        return this.horarioClaseService.deleteHorario(Number(id));
    }
}

//Tenemos dos tipos de rutas. 
// El primero trabaja con el grupo como contexto y el segundo trabaja directamente con el horario.