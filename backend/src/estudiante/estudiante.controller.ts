import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';

import { EstudianteService } from './estudiante.service';
import { CreateEstudianteDto } from './dto/create-estudiante.dto';
import { UpdateEstudianteDto } from './dto/update-estudiante.dto';

@Controller('estudiantes')
export class EstudianteController {
    constructor(private readonly estudianteService: EstudianteService) {}

    @Get()
    getEstudiantes() {
        return this.estudianteService.getEstudiantes();
    }

    @Get('/:id')
    getEstudiante(@Param('id') id: string) {
        return this.estudianteService.getEstudiante(Number(id));
    }

    @Post()
    createEstudiante(@Body() estudiante: CreateEstudianteDto) {
        return this.estudianteService.createEstudiante(estudiante);
    }

    @Patch('/:id')
    updateEstudiante(
        @Param('id') id: string,
        @Body() estudiante: UpdateEstudianteDto,
    ) {
        return this.estudianteService.updateEstudiante(
            Number(id),
            estudiante,
        );
    }

    @Delete('/:id')
    deleteEstudiante(@Param('id') id: string) {
        return this.estudianteService.deleteEstudiante(Number(id))
    }
}