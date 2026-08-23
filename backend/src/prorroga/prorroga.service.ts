import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import { CreateProrrogaDto } from './dto/create-prorroga.dto';
import { UpdateProrrogaDto } from './dto/update-prorroga.dto';

@Injectable()
export class ProrrogaService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ============================================================
  // OBTENER TODAS
  // ============================================================

  async getProrrogas() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
      SELECT
        p.id_prorroga,
        p.id_obligacion,
        p.fecha_inicio,
        p.fecha_fin,
        p.observacion,

        o.id_inscripcion,
        o.tipo_obligacion,
        o.numero_cuota,
        o.periodo,
        o.fecha_vencimiento,
        o.monto,
        o.estado AS estado_obligacion

      FROM prorroga p

      INNER JOIN obligacion_pago o
        ON p.id_obligacion = o.id_obligacion

      ORDER BY
        p.fecha_inicio DESC,
        p.id_prorroga DESC;
    `);

    return result.recordset;
  }

  // ============================================================
  // OBTENER UNA
  // ============================================================

  async getProrroga(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id_prorroga', id).query(`
        SELECT
          p.id_prorroga,
          p.id_obligacion,
          p.fecha_inicio,
          p.fecha_fin,
          p.observacion,

          o.id_inscripcion,
          o.tipo_obligacion,
          o.numero_cuota,
          o.periodo,
          o.fecha_vencimiento,
          o.monto,
          o.estado AS estado_obligacion

        FROM prorroga p

        INNER JOIN obligacion_pago o
          ON p.id_obligacion = o.id_obligacion

        WHERE p.id_prorroga = @id_prorroga;
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `La prórroga con id ${id} no fue encontrada.`,
      );
    }

    return result.recordset[0];
  }

  // ============================================================
  // OBTENER POR OBLIGACIÓN
  // ============================================================

  async getProrrogaPorObligacion(idObligacion: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id_obligacion', idObligacion)
      .query(`
        SELECT
          p.id_prorroga,
          p.id_obligacion,
          p.fecha_inicio,
          p.fecha_fin,
          p.observacion,

          o.id_inscripcion,
          o.tipo_obligacion,
          o.numero_cuota,
          o.periodo,
          o.fecha_vencimiento,
          o.monto,
          o.estado AS estado_obligacion

        FROM prorroga p

        INNER JOIN obligacion_pago o
          ON p.id_obligacion = o.id_obligacion

        WHERE p.id_obligacion = @id_obligacion;
      `);

    return result.recordset[0] ?? null;
  }

  // ============================================================
  // CREAR
  // ============================================================

  async createProrroga(prorroga: CreateProrrogaDto) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Validar fechas
    // ----------------------------------------------------------

    if (prorroga.fecha_inicio > prorroga.fecha_fin) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser posterior a la fecha de fin.',
      );
    }

    // ----------------------------------------------------------
    // Verificar obligación
    // ----------------------------------------------------------

    const obligacionResult = await pool
      .request()
      .input('id_obligacion', prorroga.id_obligacion).query(`
        SELECT
          id_obligacion,
          id_inscripcion,
          tipo_obligacion,
          numero_cuota,
          periodo,
          fecha_vencimiento,
          monto,
          estado
        FROM obligacion_pago
        WHERE id_obligacion = @id_obligacion;
      `);

    if (obligacionResult.recordset.length === 0) {
      throw new NotFoundException(
        `La obligación con id ${prorroga.id_obligacion} no fue encontrada.`,
      );
    }

    const obligacion = obligacionResult.recordset[0];

    // ----------------------------------------------------------
    // Una obligación solo puede tener una prórroga
    // ----------------------------------------------------------

    const prorrogaExistente = await pool
      .request()
      .input('id_obligacion', prorroga.id_obligacion).query(`
        SELECT id_prorroga
        FROM prorroga
        WHERE id_obligacion = @id_obligacion;
      `);

    if (prorrogaExistente.recordset.length > 0) {
      throw new BadRequestException(
        'La obligación ya tiene una prórroga registrada.',
      );
    }

    // ----------------------------------------------------------
    // La prórroga debe comenzar después del vencimiento
    // ----------------------------------------------------------

    if (
      prorroga.fecha_inicio <= this.formatearFecha(obligacion.fecha_vencimiento)
    ) {
      throw new BadRequestException(
        'La fecha de inicio de la prórroga debe ser posterior a la fecha de vencimiento de la obligación.',
      );
    }

    // ----------------------------------------------------------
    // No permitir prórroga para obligación anulada o pagada
    // ----------------------------------------------------------

    if (obligacion.estado === 'ANULADA') {
      throw new BadRequestException(
        'No se puede crear una prórroga para una obligación anulada.',
      );
    }

    if (obligacion.estado === 'PAGADA') {
      throw new BadRequestException(
        'No se puede crear una prórroga para una obligación pagada.',
      );
    }

    // ----------------------------------------------------------
    // Crear prórroga
    // ----------------------------------------------------------

    const result = await pool
      .request()
      .input('id_obligacion', prorroga.id_obligacion)
      .input('fecha_inicio', prorroga.fecha_inicio)
      .input('fecha_fin', prorroga.fecha_fin)
      .input('observacion', prorroga.observacion ?? null).query(`
        INSERT INTO prorroga (
          id_obligacion,
          fecha_inicio,
          fecha_fin,
          observacion
        )
        OUTPUT INSERTED.*
        VALUES (
          @id_obligacion,
          @fecha_inicio,
          @fecha_fin,
          @observacion
        );
      `);

    return result.recordset[0];
  }

  // ============================================================
  // ACTUALIZAR
  // ============================================================

  async updateProrroga(id: number, datos: UpdateProrrogaDto) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Obtener prórroga
    // ----------------------------------------------------------

    const prorrogaResult = await pool.request().input('id_prorroga', id).query(`
        SELECT
          p.id_prorroga,
          p.id_obligacion,
          p.fecha_inicio,
          p.fecha_fin,
          p.observacion,
          o.fecha_vencimiento,
          o.estado
        FROM prorroga p
        INNER JOIN obligacion_pago o
          ON p.id_obligacion = o.id_obligacion
        WHERE p.id_prorroga = @id_prorroga;
      `);

    if (prorrogaResult.recordset.length === 0) {
      throw new NotFoundException(
        `La prórroga con id ${id} no fue encontrada.`,
      );
    }

    const actual = prorrogaResult.recordset[0];

    // ----------------------------------------------------------
    // No modificar prórrogas de obligaciones anuladas o pagadas
    // ----------------------------------------------------------

    if (actual.estado === 'ANULADA') {
      throw new BadRequestException(
        'No se puede modificar una prórroga para una obligación anulada.',
      );
    }

    if (actual.estado === 'PAGADA') {
      throw new BadRequestException(
        'No se puede modificar una prórroga para una obligación pagada.',
      );
    }

    const fechaInicio =
      datos.fecha_inicio ?? this.formatearFecha(actual.fecha_inicio);

    const fechaFin = datos.fecha_fin ?? this.formatearFecha(actual.fecha_fin);

    // ----------------------------------------------------------
    // Validar fechas
    // ----------------------------------------------------------

    if (fechaInicio > fechaFin) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser posterior a la fecha de fin.',
      );
    }

    if (fechaInicio <= this.formatearFecha(actual.fecha_vencimiento)) {
      throw new BadRequestException(
        'La fecha de inicio de la prórroga debe ser posterior a la fecha de vencimiento de la obligación.',
      );
    }

    // ----------------------------------------------------------
    // Actualizar
    // ----------------------------------------------------------

    const result = await pool
      .request()
      .input('id_prorroga', id)
      .input('fecha_inicio', fechaInicio)
      .input('fecha_fin', fechaFin)
      .input(
        'observacion',
        datos.observacion !== undefined
          ? datos.observacion
          : actual.observacion,
      ).query(`
        UPDATE prorroga
        SET
          fecha_inicio = @fecha_inicio,
          fecha_fin = @fecha_fin,
          observacion = @observacion
        OUTPUT INSERTED.*
        WHERE id_prorroga = @id_prorroga;
      `);

    return result.recordset[0];
  }

  // ============================================================
  // ELIMINAR
  // ============================================================

  async deleteProrroga(id: number) {
    const pool = this.databaseService.getPool();

    const existe = await pool.request().input('id_prorroga', id).query(`
        SELECT
          p.id_prorroga,
          o.estado
        FROM prorroga p
        INNER JOIN obligacion_pago o
          ON p.id_obligacion = o.id_obligacion
        WHERE p.id_prorroga = @id_prorroga;
      `);

    if (existe.recordset.length === 0) {
      throw new NotFoundException(
        `La prórroga con id ${id} no fue encontrada.`,
      );
    }

    const prorroga = existe.recordset[0];

    if (prorroga.estado === 'PAGADA') {
      throw new BadRequestException(
        'No se puede eliminar una prórroga asociada a una obligación pagada.',
      );
    }

    await pool.request().input('id_prorroga', id).query(`
        DELETE FROM prorroga
        WHERE id_prorroga = @id_prorroga;
      `);

    return {
      mensaje: 'Prórroga eliminada correctamente.',
      id_prorroga: id,
    };
  }

  // ============================================================
  // FORMATEAR FECHA
  // ============================================================

  private formatearFecha(valor: Date | string): string {
    if (typeof valor === 'string') {
      return valor.substring(0, 10);
    }

    return valor.toISOString().substring(0, 10);
  }
}
