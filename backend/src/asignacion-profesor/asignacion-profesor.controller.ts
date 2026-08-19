import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { AsignacionProfesorService } from './asignacion-profesor.service';
import { CreateAsignacionProfesorDto } from './dto/create-asignacion-profesor.dto';

@Controller('asignaciones-profesor')
export class AsignacionProfesorController {
  constructor(
    private readonly asignacionProfesorService: AsignacionProfesorService,
  ) {}

  @Get()
  getAsignaciones() {
    return this.asignacionProfesorService.getAsignaciones();
  }

  @Get('/:id')
  getAsignacion(@Param('id') id: string) {
    return this.asignacionProfesorService.getAsignacion(Number(id));
  }

  @Post()
  createAsignacion(@Body() asignacion: CreateAsignacionProfesorDto) {
    return this.asignacionProfesorService.createAsignacion(asignacion);
  }

  @Delete('/:id')
  deleteAsignacion(@Param('id') id: string) {
    return this.asignacionProfesorService.deleteAsignacion(Number(id));
  }
}
