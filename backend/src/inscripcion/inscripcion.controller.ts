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

import { InscripcionService } from './inscripcion.service';

import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { UpdateInscripcionDto } from './dto/update-inscripcion.dto';

@Controller('inscripciones')
export class InscripcionController {
  constructor(private readonly inscripcionService: InscripcionService) {}

  @Get()
  getInscripciones() {
    return this.inscripcionService.getInscripciones();
  }

  @Get('/:id')
  getInscripcion(@Param('id') id: string) {
    return this.inscripcionService.getInscripcion(Number(id));
  }

  @Get('/grupo/:idGrupo')
  getInscripcionesPorGrupo(@Param('idGrupo', ParseIntPipe) idGrupo: number) {
    return this.inscripcionService.getInscripcionesPorGrupo(idGrupo);
  }

  @Post()
  createInscripcion(@Body() inscripcion: CreateInscripcionDto) {
    return this.inscripcionService.createInscripcion(inscripcion);
  }

  @Patch('/:id')
  updateInscripcion(
    @Param('id') id: string,
    @Body() inscripcion: UpdateInscripcionDto,
  ) {
    return this.inscripcionService.updateInscripcion(Number(id), inscripcion);
  }

  @Delete('/:id')
  deleteInscripcion(@Param('id') id: string) {
    return this.inscripcionService.deleteInscripcion(Number(id));
  }
}
