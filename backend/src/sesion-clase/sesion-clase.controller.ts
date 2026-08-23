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

@Controller('sesiones')
export class SesionClaseController {
  constructor(private readonly sesionClaseService: SesionClaseService) {}

  // ============================================================
  // OBTENER TODAS
  // ============================================================

  @Get()
  getSesiones() {
    return this.sesionClaseService.getSesiones();
  }

  // ============================================================
  // OBTENER UNA
  // ============================================================

  @Get(':id')
  getSesion(@Param('id', ParseIntPipe) id: number) {
    return this.sesionClaseService.getSesion(id);
  }

  @Get('grupo/:idGrupo')
  getSesionesPorGrupo(@Param('idGrupo', ParseIntPipe) idGrupo: number) {
    return this.sesionClaseService.getSesionesPorGrupo(idGrupo);
  }

  // ============================================================
  // CREAR SESIÓN MANUAL
  // ============================================================

  @Post()
  createSesion(@Body() sesion: CreateSesionClaseDto) {
    return this.sesionClaseService.createSesion(sesion);
  }

  // ============================================================
  // GENERAR SESIONES DEL GRUPO
  // ============================================================

  @Post('generar/:idGrupo')
  generarSesiones(@Param('idGrupo', ParseIntPipe) idGrupo: number) {
    return this.sesionClaseService.generarSesiones(idGrupo);
  }

  // ============================================================
  // ACTUALIZAR SESIÓN
  // ============================================================

  @Patch(':id')
  updateSesion(
    @Param('id', ParseIntPipe) id: number,
    @Body() sesion: UpdateSesionClaseDto,
  ) {
    return this.sesionClaseService.updateSesion(id, sesion);
  }

  // ============================================================
  // FINALIZAR SESIÓN
  // ============================================================

  @Patch(':id/finalizar')
  finalizarSesion(@Param('id', ParseIntPipe) id: number) {
    return this.sesionClaseService.finalizarSesion(id);
  }

  // ============================================================
  // CANCELAR SESIÓN
  // ============================================================

  @Delete(':id')
  cancelarSesion(@Param('id', ParseIntPipe) id: number) {
    return this.sesionClaseService.cancelarSesion(id);
  }
}
