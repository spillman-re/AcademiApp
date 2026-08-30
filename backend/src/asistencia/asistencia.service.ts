import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as sql from 'mssql';

import { DatabaseService } from 'src/database/database.service';

import { RegistrarAsistenciasDto } from './dto/registrar-asistencias.dto';

export interface AsistenciaRegistrada {
  id_asistencia: number;
  id_inscripcion: number;
  id_sesion: number;
  estado_asistencia: string;
  observacion: string | null;
}

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

    const result = await pool.request().input('id', id).query(`
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
  // REGISTRAR ASISTENCIAS DE UNA SESIÓN
  // ============================================================

  async registrarAsistencias(idSesion: number, data: RegistrarAsistenciasDto) {
    const pool = this.databaseService.getPool();

    // ============================================================
    // 1. OBTENER SESIÓN
    // ============================================================

    const sesionResult = await pool.request().input('id_sesion', idSesion)
      .query(`
        SELECT
          id_sesion,
          id_grupo,
          fecha_programada,
          estado_sesion
        FROM sesion_clase
        WHERE id_sesion = @id_sesion;
      `);

    if (sesionResult.recordset.length === 0) {
      throw new NotFoundException(
        `La sesión con id ${idSesion} no fue encontrada.`,
      );
    }

    const sesion = sesionResult.recordset[0];

    // ============================================================
    // 2. VALIDAR ESTADO DE LA SESIÓN
    // ============================================================

    if (sesion.estado_sesion === 'CANCELADA') {
      throw new BadRequestException(
        'No se pueden registrar asistencias de una sesión cancelada.',
      );
    }

    if (sesion.estado_sesion === 'REALIZADA') {
      throw new BadRequestException(
        'No se pueden registrar asistencias de una sesión ya realizada.',
      );
    }

    // ============================================================
    // 3. OBTENER INSCRIPCIONES ACTIVAS DEL GRUPO
    // ============================================================

    const inscripcionesResult = await pool
      .request()
      .input('id_grupo', sesion.id_grupo).query(`
        SELECT
          i.id_inscripcion,
          i.id_estudiante,
          e.nombres,
          e.apellidos
        FROM inscripcion i
        INNER JOIN estudiante e
          ON i.id_estudiante = e.id_estudiante
        WHERE i.id_grupo = @id_grupo
          AND i.estado_inscripcion = 'ACTIVA'
        ORDER BY
          e.apellidos,
          e.nombres;
      `);

    const inscripciones = inscripcionesResult.recordset;

    // ============================================================
    // 4. VALIDAR QUE EXISTAN INSCRIPCIONES
    // ============================================================

    if (inscripciones.length === 0) {
      throw new BadRequestException(
        'El grupo no tiene estudiantes con inscripción activa.',
      );
    }

    // ============================================================
    // 5. VALIDAR QUE EL DTO NO ESTÉ VACÍO
    // ============================================================

    if (data.asistencias.length === 0) {
      throw new BadRequestException(
        'Debe registrar la asistencia de los estudiantes.',
      );
    }

    // ============================================================
    // 6. VALIDAR DUPLICADOS EN EL DTO
    // ============================================================

    const idsRecibidos = data.asistencias.map(
      (asistencia) => asistencia.id_inscripcion,
    );

    const idsUnicos = new Set(idsRecibidos);

    if (idsRecibidos.length !== idsUnicos.size) {
      throw new BadRequestException(
        'No se puede registrar más de una asistencia para la misma inscripción.',
      );
    }

    // ============================================================
    // 7. VALIDAR QUE TODOS PERTENEZCAN AL GRUPO
    // ============================================================

    const idsInscritos = new Set(
      inscripciones.map((inscripcion) => inscripcion.id_inscripcion),
    );

    const idsNoPertenecientes = idsRecibidos.filter(
      (id) => !idsInscritos.has(id),
    );

    if (idsNoPertenecientes.length > 0) {
      throw new BadRequestException(
        'Una o más inscripciones no pertenecen a los estudiantes activos del grupo de esta sesión.',
      );
    }

    // ============================================================
    // 8. VALIDAR QUE ESTÉN TODOS LOS INSCRITOS
    // ============================================================

    if (idsRecibidos.length !== inscripciones.length) {
      throw new BadRequestException(
        'Debe registrar la asistencia de todos los estudiantes con inscripción activa en el grupo.',
      );
    }

    // ============================================================
    // 9. COMPROBAR SI YA SE REGISTRARON ASISTENCIAS
    // ============================================================

    const asistenciasExistentes = await pool
      .request()
      .input('id_sesion', idSesion).query(`
        SELECT COUNT(*) AS total
        FROM asistencia
        WHERE id_sesion = @id_sesion;
      `);

    if (asistenciasExistentes.recordset[0].total > 0) {
      throw new BadRequestException(
        'Las asistencias de esta sesión ya fueron registradas.',
      );
    }

    // ============================================================
    // 10. INICIAR TRANSACCIÓN
    // ============================================================

    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const resultados: AsistenciaRegistrada[] = [];

      // ==========================================================
      // 11. PROCESAR CADA ASISTENCIA
      // ==========================================================

      for (const asistencia of data.asistencias) {
        // --------------------------------------------------------
        // Verificar mora
        // --------------------------------------------------------

        const tieneMora = await this.verificarMora(
          asistencia.id_inscripcion,
          sesion.fecha_programada,
          transaction,
        );

        if (
          asistencia.estado_asistencia === 'SUSPENDIDO_POR_MORA' &&
          !tieneMora
        ) {
          throw new BadRequestException(
            `La inscripción ${asistencia.id_inscripcion} no tiene mora y no puede marcarse como SUSPENDIDO_POR_MORA.`,
          );
        }

        // --------------------------------------------------------
        // Determinar estado final
        // --------------------------------------------------------

        const estadoFinal = tieneMora
          ? 'SUSPENDIDO_POR_MORA'
          : asistencia.estado_asistencia;

        // --------------------------------------------------------
        // Insertar asistencia
        // --------------------------------------------------------

        const request = new sql.Request(transaction);

        request.input('id_inscripcion', asistencia.id_inscripcion);

        request.input('id_sesion', idSesion);

        request.input('estado_asistencia', estadoFinal);

        request.input('observacion', asistencia.observacion ?? null);

        const result = await request.query<AsistenciaRegistrada>(`
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

        resultados.push(result.recordset[0]);
      }

      // ==========================================================
      // 12. CONFIRMAR TRANSACCIÓN
      // ==========================================================

      await transaction.commit();

      return {
        message: 'Las asistencias fueron registradas correctamente.',
        id_sesion: idSesion,
        total_registradas: resultados.length,
        asistencias: resultados,
      };
    } catch (error) {
      // ==========================================================
      // 13. DESHACER TRANSACCIÓN SI OCURRE UN ERROR
      // ==========================================================

      await transaction.rollback();

      throw error;
    }
  }

  // ============================================================
  // VERIFICAR MORA
  // ============================================================

  private async verificarMora(
    idInscripcion: number,
    fechaSesion: Date,
    transaction?: sql.Transaction,
  ): Promise<boolean> {
    const pool = this.databaseService.getPool();

    const request = transaction ? new sql.Request(transaction) : pool.request();

    const result = await request
      .input('id_inscripcion', idInscripcion)
      .input('fecha_sesion', fechaSesion).query(`
      SELECT TOP 1
        o.id_obligacion
      FROM obligacion_pago o
      WHERE o.id_inscripcion = @id_inscripcion

        -- Solo las obligaciones pendientes pueden generar mora
        AND o.estado = 'PENDIENTE'

        -- La obligación debe estar vencida
        AND o.fecha_vencimiento < @fecha_sesion

        -- Debe existir saldo pendiente
        AND (
          SELECT ISNULL(SUM(p.monto_pagado), 0)
          FROM pago p
          WHERE p.id_obligacion = o.id_obligacion
        ) < o.monto

        -- No debe existir una prórroga vigente
        AND NOT EXISTS (
          SELECT 1
          FROM prorroga pr
          WHERE pr.id_obligacion = o.id_obligacion
            AND @fecha_sesion BETWEEN
                pr.fecha_inicio AND pr.fecha_fin
        );
    `);

    return result.recordset.length > 0;
  }
}
