import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { EvaluacionService } from './evaluacion.service';
import { CreateEvaluacionDto } from './dto/create-evaluacion.dto';
import { UpdateEvaluacionDto } from './dto/update-evaluacion.dto';

@Controller('evaluaciones')
export class EvaluacionController {
  constructor(
    private readonly evaluacionService: EvaluacionService,
  ) {}

  @Get()
  getEvaluaciones() {
    return this.evaluacionService.getEvaluaciones();
  }

  @Get(':id')
  getEvaluacion(@Param('id') id: string) {
    return this.evaluacionService.getEvaluacion(+id);
  }

  @Post()
  createEvaluacion(@Body() evaluacion: CreateEvaluacionDto) {
    return this.evaluacionService.createEvaluacion(evaluacion);
  }

  @Patch(':id')
  updateEvaluacion(
    @Param('id') id: string,
    @Body() evaluacion: UpdateEvaluacionDto,
  ) {
    return this.evaluacionService.updateEvaluacion(
      +id,
      evaluacion,
    );
  }
}