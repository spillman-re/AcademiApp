import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { GrupoService } from './grupo.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update_grupo.dto';

@Controller('grupos')
export class GrupoController {
    constructor(private readonly grupoService: GrupoService) {}

    @Get()
    getGrupos(){
        return this.grupoService.getGrupos();
    }

    @Get('/:id')
    getGrupo(@Param('id') id: string) {
        return this.grupoService.getGrupo(Number(id));
    }

    @Post()
    createGrupo(@Body() grupo: CreateGrupoDto) {
        return this.grupoService.createGrupo(grupo);
    }

    @Patch('/:id')
    updateGrupo( @Param('id') id: string, @Body() grupo: UpdateGrupoDto,) {
        return this.grupoService.updateGrupo(Number(id), grupo);
    }

    // Cuando un grupo se da por finalizado
    @Patch('/:id/finalizar')
    finalizarGrupo(@Param('id') id: string) {
        return this.grupoService.finalizarGrupo(Number(id));
    }
    
    @Delete('/:id') 
    deleteGrupo(@Param('id') id: string) {
        return this.grupoService.deleteGrupo(Number(id));
    }
}
