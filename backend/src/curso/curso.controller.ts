import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CursoService } from './curso.service';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';

@Controller('cursos')
export class CursoController {
    constructor(private readonly cursoService: CursoService) {}

    @Get()
    getCursos() {               
        return this.cursoService.getCursos();
    }

    @Get('/:id')
    getCurso(@Param('id') id: string) {
        return this.cursoService.getCurso(Number(id));
    }

    @Post()
    createCurso(@Body() curso: CreateCursoDto){
        return this.cursoService.createCurso(curso);
    }

    @Patch('/:id')
    updateCurso(@Param('id') id: string, @Body() curso: UpdateCursoDto) {
        return this.cursoService.updateCurso(Number(id), curso);
    }

    @Delete('/:id')
    deleteCurso(@Param('id') id: string){
        return this.cursoService.deleteCurso(Number(id));
    }
}


