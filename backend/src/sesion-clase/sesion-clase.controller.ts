import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { SesionClaseService } from './sesion-clase.service';

import { CreateSesionClaseDto } from './dto/create-sesion-clase.dto';
import { UpdateSesionClaseDto } from './dto/update-sesion-clase.dto';
import { GenerarSesionesDto } from './dto/generar-sesiones.dto';

@Controller('sesiones')
export class SesionClaseController {
  constructor(private readonly sesionClaseService: SesionClaseService) {}

    @Get()
    getSesiones() {
        return this.sesionClaseService.getSesiones();
    }

    @Get(':id')
    getSesion(@Param('id', ParseIntPipe) id: number) {
        return this.sesionClaseService.getSesion(id);
    }

    @Post()
    createSesion(@Body() sesion: CreateSesionClaseDto) {
        return this.sesionClaseService.createSesion(sesion);
    }

    @Post('generar/:idGrupo')
    generarSesiones(
        @Param('idGrupo', ParseIntPipe) idGrupo: number,
        @Body() datos: GenerarSesionesDto,
    ) {
        return this.sesionClaseService.generarSesiones(idGrupo, datos.fecha_hasta);
    }

        @Patch(':id')
    updateSesion(
        @Param('id', ParseIntPipe) id: number,
        @Body() sesion: UpdateSesionClaseDto,
    ) {
        return this.sesionClaseService.updateSesion(id, sesion);
    }

    @Patch(':id/finalizar')
    finalizarSesion(@Param('id', ParseIntPipe) id: number) {
        return this.sesionClaseService.finalizarSesion(id);
    }

    @Delete(':id')
    cancelarSesion(@Param('id', ParseIntPipe) id: number) {
        return this.sesionClaseService.cancelarSesion(id);
    }
}
