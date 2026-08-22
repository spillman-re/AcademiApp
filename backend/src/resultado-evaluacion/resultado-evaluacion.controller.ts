import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ResultadoEvaluacionService } from './resultado-evaluacion.service';
import { CreateResultadosEvaluacionDto } from './dto/create-resultados-evaluacion.dto';
import { UpdateResultadoEvaluacionDto } from './dto/update-resultado-evaluacion.dto';

@Controller('resultados-evaluacion')
export class ResultadoEvaluacionController {
  constructor(
    private readonly resultadoEvaluacionService: ResultadoEvaluacionService,
  ) {}

  @Get()
  getResultados() {
    return this.resultadoEvaluacionService.getResultados();
  }

  @Get(':id')
  getResultado(@Param('id') id: string) {
    return this.resultadoEvaluacionService.getResultado(+id);
  }

  @Post('evaluacion/:id')
  createResultados(
    @Param('id') id: string,
    @Body() resultados: CreateResultadosEvaluacionDto,
  ) {
    return this.resultadoEvaluacionService.createResultados(
      +id,
      resultados,
    );
  }

  @Patch(':id')
  updateResultado(
    @Param('id') id: string,
    @Body() resultado: UpdateResultadoEvaluacionDto,
  ) {
    return this.resultadoEvaluacionService.updateResultado(
      +id,
      resultado,
    );
  }
}
