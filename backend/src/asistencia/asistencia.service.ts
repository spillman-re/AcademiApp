import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import { CreateAsistenciaDto } from './dto/create-asistencia.dto';
import { UpdateAsistenciaDto } from './dto/update-asistencia.dto';

@Injectable()
export class AsistenciaService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ============================================================
  // OBTENER TODAS
  // ============================================================

  async getAsistencias() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
      SELECT
        a.*,
        i.id_estudiante,
        e.nombres,
        e.apellidos,
        s.id_grupo,
        s.fecha_programada,
        s.hora_inicio,
        s.hora_fin
      FROM asistencia a

      INNER JOIN inscripcion i
        ON a.id_inscripcion = i.id_inscripcion

      INNER JOIN estudiante e
        ON i.id_estudiante = e.id_estudiante

      INNER JOIN sesion_clase s
        ON a.id_sesion = s.id_sesion

      ORDER BY
        s.fecha_programada,
        s.hora_inicio,
        e.apellidos,
        e.nombres;
    `);

    return result.recordset;
  }

  // ============================================================
  // OBTENER UNA
  // ============================================================

  async getAsistencia(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool
      .request()
      .input('id', id)
      .query(`
        SELECT
          a.*,
          i.id_estudiante,
          e.nombres,
          e.apellidos,
          s.id_grupo,
          s.fecha_programada,
          s.hora_inicio,
          s.hora_fin
        FROM asistencia a

        INNER JOIN inscripcion i
          ON a.id_inscripcion = i.id_inscripcion

        INNER JOIN estudiante e
          ON i.id_estudiante = e.id_estudiante

        INNER JOIN sesion_clase s
          ON a.id_sesion = s.id_sesion

        WHERE a.id_asistencia = @id;
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `La asistencia con id ${id} no fue encontrada.`,
      );
    }

    return result.recordset[0];
  }

  // ============================================================
  // CREAR ASISTENCIA
  // ============================================================

  async createAsistencia(asistencia: CreateAsistenciaDto) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Obtener inscripción
    // ----------------------------------------------------------

    const inscripcion = await pool
      .request()
      .input('id_inscripcion', asistencia.id_inscripcion)
      .query(`
        SELECT
          i.id_inscripcion,
          i.id_estudiante,
          i.id_grupo,
          i.estado_inscripcion,
          e.nombres,
          e.apellidos
        FROM inscripcion i

        INNER JOIN estudiante e
          ON i.id_estudiante = e.id_estudiante

        WHERE i.id_inscripcion = @id_inscripcion;
      `);

    if (inscripcion.recordset.length === 0) {
      throw new NotFoundException(
        `La inscripción con id ${asistencia.id_inscripcion} no fue encontrada.`,
      );
    }

    const inscripcionActual = inscripcion.recordset[0];

    if (inscripcionActual.estado_inscripcion === 'CANCELADA') {
      throw new BadRequestException(
        'No se puede registrar asistencia para una inscripción cancelada.',
      );
    }

    // ----------------------------------------------------------
    // Obtener sesión
    // ----------------------------------------------------------

    const sesion = await pool
      .request()
      .input('id_sesion', asistencia.id_sesion)
      .query(`
        SELECT
          id_sesion,
          id_grupo,
          fecha_programada,
          hora_inicio,
          hora_fin,
          estado_sesion
        FROM sesion_clase
        WHERE id_sesion = @id_sesion;
      `);

    if (sesion.recordset.length === 0) {
      throw new NotFoundException(
        `La sesión con id ${asistencia.id_sesion} no fue encontrada.`,
      );
    }

    const sesionActual = sesion.recordset[0];

    // ----------------------------------------------------------
    // La inscripción y la sesión deben pertenecer al mismo grupo
    // ----------------------------------------------------------

    if (inscripcionActual.id_grupo !== sesionActual.id_grupo) {
      throw new BadRequestException(
        'La inscripción y la sesión no pertenecen al mismo grupo.',
      );
    }

    // ----------------------------------------------------------
    // Las sesiones canceladas no generan asistencia
    // ----------------------------------------------------------

    if (sesionActual.estado_sesion === 'CANCELADA') {
      throw new BadRequestException(
        'No se puede registrar asistencia para una sesión cancelada.',
      );
    }

    // ----------------------------------------------------------
    // Evitar asistencia duplicada
    // ----------------------------------------------------------

    const existente = await pool
      .request()
      .input('id_inscripcion', asistencia.id_inscripcion)
      .input('id_sesion', asistencia.id_sesion)
      .query(`
        SELECT id_asistencia
        FROM asistencia
        WHERE id_inscripcion = @id_inscripcion
        AND id_sesion = @id_sesion;
      `);

    if (existente.recordset.length > 0) {
      throw new BadRequestException(
        'Ya existe una asistencia para este estudiante en esta sesión.',
      );
    }

    // ----------------------------------------------------------
    // Validar SUSPENDIDO_POR_MORA
    // ----------------------------------------------------------

    if (asistencia.estado_asistencia === 'SUSPENDIDO_POR_MORA') {
      const mora = await this.verificarMora(
        asistencia.id_inscripcion,
        sesionActual.fecha_programada,
      );

      if (!mora) {
        throw new BadRequestException(
          'El estudiante no tiene una obligación vencida sin prórroga válida.',
        );
      }
    }

    // ----------------------------------------------------------
    // Crear asistencia
    // ----------------------------------------------------------

    const result = await pool
      .request()
      .input('id_inscripcion', asistencia.id_inscripcion)
      .input('id_sesion', asistencia.id_sesion)
      .input('estado_asistencia', asistencia.estado_asistencia)
      .input('observacion', asistencia.observacion ?? null)
      .query(`
        INSERT INTO asistencia (
          id_inscripcion,
          id_sesion,
          estado_asistencia,
          observacion
        )
        OUTPUT INSERTED.*
        VALUES (
          @id_inscripcion,
          @id_sesion,
          @estado_asistencia,
          @observacion
        );
      `);

    return result.recordset[0];
  }

  // ============================================================
  // ACTUALIZAR ASISTENCIA
  // ============================================================

  async updateAsistencia(
    id: number,
    asistencia: UpdateAsistenciaDto,
  ) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Obtener asistencia actual
    // ----------------------------------------------------------

    const existente = await pool
      .request()
      .input('id', id)
      .query(`
        SELECT
          a.*,
          i.id_grupo,
          s.estado_sesion,
          s.fecha_programada
        FROM asistencia a

        INNER JOIN inscripcion i
          ON a.id_inscripcion = i.id_inscripcion

        INNER JOIN sesion_clase s
          ON a.id_sesion = s.id_sesion

        WHERE a.id_asistencia = @id;
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(
        `La asistencia con id ${id} no fue encontrada.`,
      );
    }

    const actual = existente.recordset[0];

    // ----------------------------------------------------------
    // No modificar asistencia de sesión cancelada
    // ----------------------------------------------------------

    if (actual.estado_sesion === 'CANCELADA') {
      throw new BadRequestException(
        'No se puede modificar la asistencia de una sesión cancelada.',
      );
    }

    const nuevoEstado =
      asistencia.estado_asistencia ??
      actual.estado_asistencia;

    const nuevaObservacion =
      asistencia.observacion !== undefined
        ? asistencia.observacion
        : actual.observacion;

    // ----------------------------------------------------------
    // Validar SUSPENDIDO_POR_MORA
    // ----------------------------------------------------------

    if (nuevoEstado === 'SUSPENDIDO_POR_MORA') {
      const mora = await this.verificarMora(
        actual.id_inscripcion,
        actual.fecha_programada,
      );

      if (!mora) {
        throw new BadRequestException(
          'El estudiante no tiene una obligación vencida sin prórroga válida.',
        );
      }
    }

    // ----------------------------------------------------------
    // Actualizar
    // ----------------------------------------------------------

    const result = await pool
      .request()
      .input('id', id)
      .input('estado_asistencia', nuevoEstado)
      .input('observacion', nuevaObservacion)
      .query(`
        UPDATE asistencia
        SET
          estado_asistencia = @estado_asistencia,
          observacion = @observacion
        OUTPUT INSERTED.*
        WHERE id_asistencia = @id;
      `);

    return result.recordset[0];
  }

  // ============================================================
  // VERIFICAR MORA
  // ============================================================

  private async verificarMora(
    idInscripcion: number,
    fechaSesion: Date,
  ): Promise<boolean> {
    const pool = this.databaseService.getPool();

    const result = await pool
      .request()
      .input('id_inscripcion', idInscripcion)
      .input('fecha_sesion', fechaSesion)
      .query(`
        SELECT
          o.id_obligacion

        FROM obligacion_pago o

        WHERE o.id_inscripcion = @id_inscripcion

        AND o.fecha_vencimiento < @fecha_sesion

        AND (
          SELECT ISNULL(SUM(p.monto_pagado), 0)
          FROM pago p
          WHERE p.id_obligacion = o.id_obligacion
        ) < o.monto

        AND NOT EXISTS (
          SELECT 1
          FROM prorroga pr
          WHERE pr.id_obligacion = o.id_obligacion
          AND @fecha_sesion BETWEEN pr.fecha_inicio AND pr.fecha_fin
        );
      `);

    return result.recordset.length > 0;
  }
}