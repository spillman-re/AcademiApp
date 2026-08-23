import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { ObligacionPagoService } from './obligacion-pago.service';

@Controller('obligaciones-pago')
export class ObligacionPagoController {
  constructor(
    private readonly obligacionPagoService: ObligacionPagoService,
  ) {}

  // ============================================================
  // OBTENER TODAS
  // ============================================================

  @Get()
  getObligaciones() {
    return this.obligacionPagoService.getObligaciones();
  }

  // ============================================================
  // OBTENER UNA
  // ============================================================

  @Get(':id')
  getObligacion(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.obligacionPagoService.getObligacion(id);
  }

  // ============================================================
  // OBTENER POR INSCRIPCIÓN
  // ============================================================

  @Get('inscripcion/:idInscripcion')
  getObligacionesPorInscripcion(
    @Param('idInscripcion', ParseIntPipe)
    idInscripcion: number,
  ) {
    return this.obligacionPagoService.getObligacionesPorInscripcion(
      idInscripcion,
    );
  }

  // ============================================================
  // GENERAR AUTOMÁTICAMENTE
  // ============================================================

  @Post('inscripcion/:idInscripcion/generar')
  generarObligaciones(
    @Param('idInscripcion', ParseIntPipe)
    idInscripcion: number,
  ) {
    return this.obligacionPagoService.generarObligaciones(
      idInscripcion,
    );
  }
}