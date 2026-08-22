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

import { AsistenciaService } from './asistencia.service';
import { CreateAsistenciaDto } from './dto/create-asistencia.dto';
import { UpdateAsistenciaDto } from './dto/update-asistencia.dto';

@Controller('asistencias')
export class AsistenciaController {
  constructor(private readonly asistenciaService: AsistenciaService) {}

  // Obtener todas las asistencias
  @Get()
  getAsistencias() {
    return this.asistenciaService.getAsistencias();
  }

  // Obtener una asistencia
  @Get(':id')
  getAsistencia(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.asistenciaService.getAsistencia(id);
  }

  // Crear asistencia
  @Post()
  createAsistencia(
    @Body() asistencia: CreateAsistenciaDto,
  ) {
    return this.asistenciaService.createAsistencia(asistencia);
  }

  // Actualizar estado/observación
  @Patch(':id')
  updateAsistencia(
    @Param('id', ParseIntPipe) id: number,
    @Body() asistencia: UpdateAsistenciaDto,
  ) {
    return this.asistenciaService.updateAsistencia(
      id,
      asistencia,
    );
  }
}