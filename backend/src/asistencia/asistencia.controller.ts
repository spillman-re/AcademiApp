import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { AsistenciaService } from './asistencia.service';
import { RegistrarAsistenciasDto } from './dto/registrar-asistencias.dto';

@Controller('asistencias')
export class AsistenciaController {
  constructor(
    private readonly asistenciaService: AsistenciaService,
  ) {}

  @Get()
  getAsistencias() {
    return this.asistenciaService.getAsistencias();
  }

  @Get(':id')
  getAsistencia(@Param('id') id: string) {
    return this.asistenciaService.getAsistencia(+id);
  }

  @Post('sesion/:id')
  registrarAsistencias(
    @Param('id') id: string,
    @Body() data: RegistrarAsistenciasDto,
  ) {
    return this.asistenciaService.registrarAsistencias(
      +id,
      data,
    );
  }
}