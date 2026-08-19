import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { ProfesorService } from './profesor.service';
import { CreateProfesorDto } from './dto/create-profesor.dto';
import { UpdateProfesorDto } from './dto/update-profesor.dto';

@Controller('profesores')
export class ProfesorController {
  constructor(private readonly profesorService: ProfesorService) {}

  @Get()
  getProfesores() {
    return this.profesorService.getProfesores();
  }

  @Get('/:id')
  getProfesor(@Param('id') id: string) {
    return this.profesorService.getProfesor(Number(id));
  }

  @Post()
  createProfesor(@Body() profesor: CreateProfesorDto) {
    return this.profesorService.createProfesor(profesor);
  }

  @Patch('/:id')
  updateProfesor(@Param('id') id: string, @Body() profesor: UpdateProfesorDto) {
    return this.profesorService.updateProfesor(Number(id), profesor);
  }

  @Delete('/:id')
  deleteProfesor(@Param('id') id: string) {
    return this.profesorService.deleteProfesor(Number(id));
  }
}
