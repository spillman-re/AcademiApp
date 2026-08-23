import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as sql from 'mssql';

import { DatabaseService } from 'src/database/database.service';

import { CreateResultadosEvaluacionDto } from './dto/create-resultados-evaluacion.dto';
import { UpdateResultadoEvaluacionDto } from './dto/update-resultado-evaluacion.dto';

@Injectable()
export class ResultadoEvaluacionService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ============================================================
  // OBTENER TODOS
  // ============================================================

  async getResultados() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
      SELECT
        r.*,
        e.tipo_evaluacion,
        e.id_sesion,
        i.id_estudiante,
        est.codigo_estudiante,
        est.nombres,
        est.apellidos
      FROM resultado_evaluacion r
      INNER JOIN evaluacion e
        ON r.id_evaluacion = e.id_evaluacion
      INNER JOIN inscripcion i
        ON r.id_inscripcion = i.id_inscripcion
      INNER JOIN estudiante est
        ON i.id_estudiante = est.id_estudiante
      ORDER BY
        e.id_evaluacion,
        est.apellidos,
        est.nombres;
    `);

    return result.recordset;
  }

  // ============================================================
  // OBTENER UNO
  // ============================================================

  async getResultado(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
        SELECT
          r.*,
          e.tipo_evaluacion,
          e.id_sesion,
          i.id_estudiante,
          est.codigo_estudiante,
          est.nombres,
          est.apellidos
        FROM resultado_evaluacion r
        INNER JOIN evaluacion e
          ON r.id_evaluacion = e.id_evaluacion
        INNER JOIN inscripcion i
          ON r.id_inscripcion = i.id_inscripcion
        INNER JOIN estudiante est
          ON i.id_estudiante = est.id_estudiante
        WHERE r.id_resultado = @id;
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `El resultado con id ${id} no fue encontrado.`,
      );
    }

    return result.recordset[0];
  }

  // ============================================================
  // REGISTRAR RESULTADOS DE UNA EVALUACIÓN
  // ============================================================

  async createResultados(
    idEvaluacion: number,
    data: CreateResultadosEvaluacionDto,
  ) {
    const pool = this.databaseService.getPool();

    // ==========================================================
    // 1. VERIFICAR EVALUACIÓN + SESIÓN + GRUPO
    // ==========================================================

    const evaluacionResult = await pool
      .request()
      .input('id_evaluacion', idEvaluacion).query(`
        SELECT
          e.id_evaluacion,
          e.id_sesion,
          s.id_grupo,
          s.estado_sesion
        FROM evaluacion e
        INNER JOIN sesion_clase s
          ON e.id_sesion = s.id_sesion
        WHERE e.id_evaluacion = @id_evaluacion;
      `);

    if (evaluacionResult.recordset.length === 0) {
      throw new NotFoundException(
        `La evaluación con id ${idEvaluacion} no fue encontrada.`,
      );
    }

    const evaluacion = evaluacionResult.recordset[0];

    // ==========================================================
    // 2. VALIDAR ESTADO DE LA SESIÓN
    // ==========================================================

    if (evaluacion.estado_sesion === 'CANCELADA') {
      throw new BadRequestException(
        'No se pueden registrar resultados para una sesión cancelada.',
      );
    }

    if (evaluacion.estado_sesion === 'REALIZADA') {
      throw new BadRequestException(
        'No se pueden registrar nuevos resultados para una sesión que ya fue realizada.',
      );
    }    

    // ==========================================================
    // 4. VERIFICAR ASISTENCIAS DE LA SESIÓN
    // ==========================================================

    const asistenciasResult = await pool
      .request()
      .input('id_sesion', evaluacion.id_sesion)
      .input('id_grupo', evaluacion.id_grupo).query(`
        SELECT
          a.id_inscripcion,
          a.estado_asistencia
        FROM asistencia a
        INNER JOIN inscripcion i
          ON a.id_inscripcion = i.id_inscripcion
        WHERE a.id_sesion = @id_sesion
          AND i.id_grupo = @id_grupo;
      `);

    const asistencias = asistenciasResult.recordset;

    if (asistencias.length === 0) {
      throw new BadRequestException(
        'No existen asistencias registradas para esta sesión. Primero debe registrarse la asistencia.',
      );
    }

    // ==========================================================
    // 5. VERIFICAR INSCRIPCIONES REPETIDAS
    // ==========================================================

    const idsEnviados = data.resultados.map(
      (resultado) => resultado.id_inscripcion,
    );

    const idsUnicos = new Set(idsEnviados);

    if (idsEnviados.length !== idsUnicos.size) {
      throw new BadRequestException(
        'No puede haber inscripciones repetidas en los resultados.',
      );
    }

    // ==========================================================
    // 6. MAPA DE ASISTENCIAS
    // ==========================================================

    const asistenciaMap = new Map<number, string>();

    for (const asistencia of asistencias) {
      asistenciaMap.set(
        asistencia.id_inscripcion,
        asistencia.estado_asistencia,
      );
    }

    // ==========================================================
    // 7. VALIDAR QUE LAS INSCRIPCIONES ENVIADAS
    //    TENGAN ASISTENCIA EN ESTA SESIÓN
    // ==========================================================

    for (const resultado of data.resultados) {
      if (!asistenciaMap.has(resultado.id_inscripcion)) {
        throw new BadRequestException(
          `La inscripción ${resultado.id_inscripcion} no tiene asistencia registrada para esta sesión.`,
        );
      }

      const estadoAsistencia = asistenciaMap.get(resultado.id_inscripcion);

      // El frontend solamente debe enviar PRESENTES
      if (estadoAsistencia !== 'PRESENTE') {
        throw new BadRequestException(
          `La inscripción ${resultado.id_inscripcion} no estuvo PRESENTE y no debe enviarse en los resultados.`,
        );
      }
    }

    // ==========================================================
    // 8. VERIFICAR QUE TODOS LOS PRESENTES TENGAN RESULTADO
    // ==========================================================

    const presentes = asistencias.filter(
      (asistencia) => asistencia.estado_asistencia === 'PRESENTE',
    );

    const presentesSinResultado = presentes.filter(
      (asistencia) => !idsUnicos.has(asistencia.id_inscripcion),
    );

    if (presentesSinResultado.length > 0) {
      const idsFaltantes = presentesSinResultado.map(
        (asistencia) => asistencia.id_inscripcion,
      );

      throw new BadRequestException(
        `Debe registrar el resultado de todos los estudiantes presentes. Inscripciones faltantes: ${idsFaltantes.join(', ')}`,
      );
    }

    // ==========================================================
    // 9. VERIFICAR RESULTADOS PREVIOS
    // ==========================================================

    for (const resultado of data.resultados) {
      const existente = await pool
        .request()
        .input('id_evaluacion', idEvaluacion)
        .input('id_inscripcion', resultado.id_inscripcion).query(`
          SELECT id_resultado
          FROM resultado_evaluacion
          WHERE id_evaluacion = @id_evaluacion
            AND id_inscripcion = @id_inscripcion;
        `);

      if (existente.recordset.length > 0) {
        throw new BadRequestException(
          `La inscripción ${resultado.id_inscripcion} ya tiene un resultado para esta evaluación.`,
        );
      }
    }

    // ==========================================================
    // 10. INICIAR TRANSACCIÓN
    // ==========================================================

    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const resultadosCreados: any[] = [];

      // ========================================================
      // 11. CREAR RESULTADOS DE LOS PRESENTES
      // ========================================================

      for (const resultado of data.resultados) {
        if (resultado.nota === undefined || resultado.nota === null) {
          throw new BadRequestException(
            `La inscripción ${resultado.id_inscripcion} estuvo presente y debe tener una nota.`,
          );
        }

        if (resultado.nota < 0 || resultado.nota > 100) {
          throw new BadRequestException(
            `La nota de la inscripción ${resultado.id_inscripcion} debe estar entre 0 y 100.`,
          );
        }

        const request = new sql.Request(transaction);

        request
          .input('id_evaluacion', idEvaluacion)
          .input('id_inscripcion', resultado.id_inscripcion)
          .input('nota', resultado.nota)
          .input('estado_resultado', 'CALIFICADO');

        const result = await request.query(`
          INSERT INTO resultado_evaluacion (
            id_evaluacion,
            id_inscripcion,
            nota,
            estado_resultado
          )
          OUTPUT INSERTED.*
          VALUES (
            @id_evaluacion,
            @id_inscripcion,
            @nota,
            @estado_resultado
          );
        `);

        resultadosCreados.push(result.recordset[0]);
      }

      // ========================================================
      // 12. GENERAR AUTOMÁTICAMENTE NO_SE_PRESENTO
      //     PARA LOS NO PRESENTES
      // ========================================================

      const noPresentes = asistencias.filter(
        (asistencia) =>
          asistencia.estado_asistencia === 'AUSENTE' ||
          asistencia.estado_asistencia === 'JUSTIFICADO' ||
          asistencia.estado_asistencia === 'SUSPENDIDO_POR_MORA',
      );

      for (const asistencia of noPresentes) {
        const request = new sql.Request(transaction);

        request
          .input('id_evaluacion', idEvaluacion)
          .input('id_inscripcion', asistencia.id_inscripcion)
          .input('nota', null)
          .input('estado_resultado', 'NO_SE_PRESENTO');

        const result = await request.query(`
          INSERT INTO resultado_evaluacion (
            id_evaluacion,
            id_inscripcion,
            nota,
            estado_resultado
          )
          OUTPUT INSERTED.*
          VALUES (
            @id_evaluacion,
            @id_inscripcion,
            @nota,
            @estado_resultado
          );
        `);

        resultadosCreados.push(result.recordset[0]);
      }

      // ========================================================
      // 13. VERIFICAR SI TODAS LAS EVALUACIONES DE LA SESIÓN
      //     YA ESTÁN COMPLETAMENTE PROCESADAS
      // ========================================================

      const evaluacionesSesion = await new sql.Request(transaction).input(
        'id_sesion',
        evaluacion.id_sesion,
      ).query(`
        SELECT
          e.id_evaluacion
        FROM evaluacion e
        WHERE e.id_sesion = @id_sesion;
      `);

      const evaluaciones: { id_evaluacion: number }[] =
        evaluacionesSesion.recordset;

      const evaluacionesIncompletas: number[] = [];

      let sesionFinalizada = false;

      if (evaluaciones.length > 0) {
        for (const evaluacionSesion of evaluaciones) {
          const resultadoEvaluacion = await new sql.Request(transaction).input(
            'id_evaluacion',
            evaluacionSesion.id_evaluacion,
          ).query(`
            SELECT COUNT(*) AS total
            FROM resultado_evaluacion
            WHERE id_evaluacion = @id_evaluacion;
          `);

          const totalResultados = resultadoEvaluacion.recordset[0].total;

          if (totalResultados < asistencias.length) {
            evaluacionesIncompletas.push(evaluacionSesion.id_evaluacion);
          }
        }

        // Si ninguna evaluación está incompleta,
        // la sesión puede darse por realizada.
        if (evaluacionesIncompletas.length === 0) {
          await new sql.Request(transaction).input(
            'id_sesion',
            evaluacion.id_sesion,
          ).query(`
              UPDATE sesion_clase
              SET estado_sesion = 'REALIZADA'
              WHERE id_sesion = @id_sesion;
            `);

          sesionFinalizada = true;
        }
      }

      // ========================================================
      // 14. CONFIRMAR TRANSACCIÓN
      // ========================================================

      await transaction.commit();

      return {
        mensaje: 'Resultados registrados correctamente.',
        id_evaluacion: idEvaluacion,
        cantidad: resultadosCreados.length,
        sesion_finalizada: sesionFinalizada,
        resultados: resultadosCreados,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ============================================================
  // ACTUALIZAR UN RESULTADO
  // ============================================================

  async updateResultado(id: number, data: UpdateResultadoEvaluacionDto) {
    const pool = this.databaseService.getPool();

    // ==========================================================
    // 1. OBTENER RESULTADO + EVALUACIÓN + SESIÓN
    // ==========================================================

    const existente = await pool.request().input('id', id).query(`
        SELECT
          r.id_resultado,
          r.id_evaluacion,
          r.id_inscripcion,
          r.nota,
          r.estado_resultado,
          e.id_sesion,
          s.id_grupo,
          s.estado_sesion
        FROM resultado_evaluacion r
        INNER JOIN evaluacion e
          ON r.id_evaluacion = e.id_evaluacion
        INNER JOIN sesion_clase s
          ON e.id_sesion = s.id_sesion
        WHERE r.id_resultado = @id;
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(
        `El resultado con id ${id} no fue encontrado.`,
      );
    }

    const actual = existente.recordset[0];

    // ==========================================================
    // 2. VALIDAR ESTADO DE LA SESIÓN
    // ==========================================================

    if (
      actual.estado_sesion === 'CANCELADA' ||
      actual.estado_sesion === 'REALIZADA'
    ) {
      throw new BadRequestException(
        'No se puede modificar un resultado perteneciente a una sesión cancelada o ya realizada.',
      );
    }

    // ==========================================================
    // 3. VERIFICAR INSCRIPCIÓN
    // ==========================================================

    const inscripcion = await pool
      .request()
      .input('id_inscripcion', actual.id_inscripcion).query(`
        SELECT
          id_inscripcion,
          estado_inscripcion
        FROM inscripcion
        WHERE id_inscripcion = @id_inscripcion;
      `);

    if (inscripcion.recordset.length === 0) {
      throw new NotFoundException(
        `La inscripción ${actual.id_inscripcion} no fue encontrada.`,
      );
    }

    if (inscripcion.recordset[0].estado_inscripcion === 'CANCELADA') {
      throw new BadRequestException(
        'No se puede modificar un resultado de una inscripción cancelada.',
      );
    }

    // ==========================================================
    // 4. OBTENER ASISTENCIA
    // ==========================================================

    const asistencia = await pool
      .request()
      .input('id_inscripcion', actual.id_inscripcion)
      .input('id_sesion', actual.id_sesion).query(`
        SELECT
          id_asistencia,
          estado_asistencia
        FROM asistencia
        WHERE id_inscripcion = @id_inscripcion
          AND id_sesion = @id_sesion;
      `);

    if (asistencia.recordset.length === 0) {
      throw new BadRequestException(
        'La inscripción no tiene asistencia registrada para esta sesión.',
      );
    }

    const estadoAsistencia = asistencia.recordset[0].estado_asistencia;

    // ==========================================================
    // 5. LA ASISTENCIA MANDA
    // ==========================================================

    let nota: number | null;
    let estadoResultado: 'CALIFICADO' | 'NO_SE_PRESENTO';

    if (estadoAsistencia === 'PRESENTE') {
      estadoResultado = 'CALIFICADO';

      nota = data.nota !== undefined ? data.nota : actual.nota;

      if (nota === null || nota === undefined) {
        throw new BadRequestException(
          'Un estudiante con asistencia PRESENTE debe tener una nota.',
        );
      }

      if (nota < 0 || nota > 100) {
        throw new BadRequestException('La nota debe estar entre 0 y 100.');
      }
    } else if (
      estadoAsistencia === 'AUSENTE' ||
      estadoAsistencia === 'JUSTIFICADO' ||
      estadoAsistencia === 'SUSPENDIDO_POR_MORA'
    ) {
      estadoResultado = 'NO_SE_PRESENTO';
      nota = null;
    } else {
      throw new BadRequestException('El estado de asistencia no es válido.');
    }

    // ==========================================================
    // 6. ACTUALIZAR
    // ==========================================================

    const result = await pool
      .request()
      .input('id', id)
      .input('nota', nota)
      .input('estado_resultado', estadoResultado).query(`
        UPDATE resultado_evaluacion
        SET
          nota = @nota,
          estado_resultado = @estado_resultado
        WHERE id_resultado = @id;

        SELECT
          r.*,
          e.tipo_evaluacion,
          e.id_sesion,
          i.id_estudiante,
          est.codigo_estudiante,
          est.nombres,
          est.apellidos
        FROM resultado_evaluacion r
        INNER JOIN evaluacion e
          ON r.id_evaluacion = e.id_evaluacion
        INNER JOIN inscripcion i
          ON r.id_inscripcion = i.id_inscripcion
        INNER JOIN estudiante est
          ON i.id_estudiante = est.id_estudiante
        WHERE r.id_resultado = @id;
      `);

    return result.recordsets[1][0];
  }
}
